import { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import type {
  RibParams,
  InstallationMode,
  LightingPreset,
} from '../engine/types';
import { WAVE_TYPES } from '../engine/types';
import { loadImageData, clearImageData, hasImageData, loadImageFromUrl } from '../engine/ribEngine';
import { PATTERNS } from '../engine/patterns';

interface ControlPanelProps {
  params: RibParams;
  onParamsChange: (params: RibParams) => void;
  installationMode: InstallationMode;
  onInstallationModeChange: (mode: InstallationMode) => void;
  lightingPreset: LightingPreset;
  onLightingPresetChange: (preset: LightingPreset) => void;
  ledEnabled: boolean;
  onLedEnabledChange: (enabled: boolean) => void;
  ledColorStart: string;
  onLedColorStartChange: (color: string) => void;
  ledColorEnd: string;
  onLedColorEndChange: (color: string) => void;
  ledIntensity: number;
  onLedIntensityChange: (intensity: number) => void;
  backdropColor: string;
  onBackdropColorChange: (color: string) => void;
  bgColor: string;
  onBgColorChange: (color: string) => void;
  floorEnabled: boolean;
  onFloorEnabledChange: (enabled: boolean) => void;
  wallpaperEnabled: boolean;
  onWallpaperEnabledChange: (enabled: boolean) => void;
  scaleFigureEnabled: boolean;
  onScaleFigureEnabledChange: (enabled: boolean) => void;
  imageScale: number;
  onImageScaleChange: (scale: number) => void;
  onImageModeChange: (hasImage: boolean) => void;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#3a3a42] rounded-lg mb-3">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">{title}</span>
        <span className="text-[#666] text-[10px]">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 pb-3.5 pt-0.5">{children}</div>}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  info,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  info?: string;
}) {
  return (
    <div className="mb-2.5 last:mb-0">
      <label className="flex justify-between mb-1 text-[11px] text-[#ccc]">
        <span className="truncate mr-2">{label}</span>
        <span className="text-[#7c9bff] font-medium font-mono shrink-0">
          {format ? format(value) : value}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {info && <p className="text-[10px] text-[#666] mt-0.5">{info}</p>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <label className="text-xs text-[#ccc]">{label}</label>
      <label className="relative w-11 h-6 cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-[#555] rounded-full peer-checked:bg-[#7c9bff] transition-colors" />
        <div className="absolute left-[3px] bottom-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

export default function ControlPanel(props: ControlPanelProps) {
  const {
    params,
    onParamsChange,
    installationMode,
    onInstallationModeChange,
    lightingPreset,
    onLightingPresetChange,
    ledEnabled,
    onLedEnabledChange,
    ledColorStart,
    onLedColorStartChange,
    ledColorEnd,
    onLedColorEndChange,
    ledIntensity,
    onLedIntensityChange,
    backdropColor,
    onBackdropColorChange,
    bgColor,
    onBgColorChange,
    floorEnabled,
    onFloorEnabledChange,
    wallpaperEnabled,
    onWallpaperEnabledChange,
    scaleFigureEnabled,
    onScaleFigureEnabledChange,
    imageScale,
    onImageScaleChange,
    onImageModeChange,
    rendererRef,
    sceneRef,
    cameraRef,
  } = props;

  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Render state
  const [rendering, setRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [scenePrompt, setScenePrompt] = useState('');
  const [serverHasFalKey, setServerHasFalKey] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => { if (cfg.hasFalKey) setServerHasFalKey(true); })
      .catch(() => {});
  }, []);

  const captureScreenshot = useCallback((): string | null => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return null;
    renderer.render(scene, camera);
    const canvas = renderer.domElement;
    const maxDim = 1536;
    const w = canvas.width;
    const h = canvas.height;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    if (scale === 1) return canvas.toDataURL('image/jpeg', 0.85);
    const off = document.createElement('canvas');
    off.width = Math.round(w * scale);
    off.height = Math.round(h * scale);
    const ctx = off.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(canvas, 0, 0, off.width, off.height);
    return off.toDataURL('image/jpeg', 0.85);
  }, [rendererRef, sceneRef, cameraRef]);

  const handleRender = useCallback(async () => {
    const falKey = typeof window !== 'undefined' ? (localStorage.getItem('ribmaker_fal_key') ?? '') : '';
    if (!falKey && !serverHasFalKey) {
      setRenderError('FAL API key required (open Ask Mara to enter one).');
      return;
    }
    setRendering(true);
    setRenderError(null);
    setRenderResult(null);
    try {
      const dataUrl = captureScreenshot();
      if (!dataUrl) throw new Error('Could not capture screenshot');
      const base64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (falKey) headers['x-fal-key'] = falKey;
      const res = await fetch('/api/render', {
        method: 'POST',
        headers,
        body: JSON.stringify({ image: base64, prompt: scenePrompt }),
      });
      const text = await res.text();
      let data: { imageUrl?: string; error?: string };
      try { data = JSON.parse(text); } catch { throw new Error(`Server error (${res.status})`); }
      if (!res.ok) throw new Error(data.error || 'Render failed');
      if (!data.imageUrl) throw new Error('No image returned');
      setRenderResult(data.imageUrl);
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : 'Render failed');
    } finally {
      setRendering(false);
    }
  }, [serverHasFalKey, scenePrompt, captureScreenshot]);

  const handleDownloadRender = useCallback(async () => {
    if (!renderResult) return;
    try {
      const res = await fetch(renderResult);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mr-walls-render.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab so user can save manually
      window.open(renderResult, '_blank');
    }
  }, [renderResult]);

  const updateParam = useCallback(
    (key: keyof RibParams, value: number | string) => {
      onParamsChange({ ...params, [key]: value });
    },
    [params, onParamsChange]
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      try {
        const dataUrl = await loadImageData(file);
        setImagePreviewSrc(dataUrl);
        onImageModeChange(true);
      } catch {
        alert('Failed to load image');
      }
    },
    [onImageModeChange]
  );

  const handleClearImage = useCallback(() => {
    clearImageData();
    setImagePreviewSrc(null);
    onImageModeChange(false);
  }, [onImageModeChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleImageUpload(e.dataTransfer.files[0]);
      }
    },
    [handleImageUpload]
  );

  const curveControlSpacing = params.height / (params.controlPoints - 1);
  const curveSegmentSize = params.height / params.displayResolution;

  return (
    <div>
      {/* Browse Patterns — pick a preset or upload your own below */}
      <Section title="Browse Patterns" defaultOpen={true}>
        <div className="grid grid-cols-3 gap-1.5 max-h-[260px] overflow-y-auto pb-1">
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              onClick={async () => {
                try {
                  await loadImageFromUrl(`/patterns/${p.file}`);
                  setImagePreviewSrc(`/patterns/${p.file}`);
                  onImageModeChange(true);
                } catch {
                  alert('Failed to load pattern');
                }
              }}
              className="p-1 bg-[#1a1a1f] border border-[#3a3a42] rounded cursor-pointer text-center hover:border-[#7c9bff] transition-colors"
            >
              <img
                src={`/patterns/${p.file}`}
                alt={p.name}
                className="w-full h-[50px] object-cover rounded-sm"
              />
              <div className="text-[9px] text-[#888] mt-0.5 truncate">{p.name}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Image Upload */}
      <Section title="Profile Image (Optional)">
        <div
          className="border-2 border-dashed border-[#555] rounded-lg p-4 text-center cursor-pointer
                     hover:border-[#7c9bff] hover:bg-[rgba(124,155,255,0.1)] transition-all min-h-[80px]
                     flex flex-col items-center justify-center"
          onClick={() => document.getElementById('image-file-input')?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {imagePreviewSrc ? (
            <img src={imagePreviewSrc} alt="Preview" className="max-w-full max-h-20 rounded" />
          ) : (
            <>
              <div className="text-2xl mb-2">📷</div>
              <p className="text-[11px] text-[#888]">Drag & drop image or click to browse</p>
              <p className="text-[11px] text-[#888]">Brightness controls rib depth</p>
            </>
          )}
        </div>
        <input
          type="file"
          id="image-file-input"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleImageUpload(e.target.files[0]);
          }}
        />
        {imagePreviewSrc && (
          <button
            className="w-full mt-1.5 py-2.5 rounded-md bg-[#4a4a52] hover:bg-[#5a5a62] text-white text-xs font-medium transition-colors"
            onClick={handleClearImage}
          >
            Clear Image
          </button>
        )}
      </Section>

      {/* Render Realistic */}
      <Section title="Render Realistic" defaultOpen={true}>
        <textarea
          value={scenePrompt}
          onChange={(e) => setScenePrompt(e.target.value)}
          placeholder="Optional: describe the scene (e.g. 'modern hotel lobby, marble floors, warm light')"
          rows={2}
          className="w-full px-2.5 py-2 bg-[#1a1a1f] border border-[#3a3a42] rounded text-white text-[11px] resize-none outline-none focus:border-[#7a5aaa] mb-2"
        />
        <button
          onClick={handleRender}
          disabled={rendering}
          className={`w-full py-2.5 rounded-md text-white text-xs font-semibold transition-all ${
            rendering
              ? 'bg-[#5a3a7a] cursor-default'
              : 'bg-gradient-to-br from-[#7a5aaa] to-[#5a3a8a] hover:brightness-110 shadow-[0_2px_10px_rgba(122,90,170,0.35)]'
          }`}
        >
          {rendering ? 'Rendering…' : 'Render Realistic'}
        </button>
        {renderError && (
          <div className="mt-2 px-2 py-1.5 rounded bg-[#4a2a2a] text-[#ff6b6b] text-[10px]">
            {renderError}
          </div>
        )}
      </Section>

      {/* Installation Guide */}
      <Section title="Installation Guide" defaultOpen={true}>
        <p className="text-[11px] text-[#aaa] mb-2 leading-relaxed">
          Step-by-step assembly: fin into channel, L-bracket fastening, and detail views.
        </p>
        <button
          onClick={() => setInstallOpen(true)}
          className="w-full py-2.5 rounded-md bg-[#4a4a52] hover:bg-[#5a5a62] text-white text-xs font-medium transition-colors"
        >
          View Installation Drawings
        </button>
      </Section>

      {hasImageData() && (
        <Section title="Image Scale">
          <Slider
            label="Image Scale"
            value={imageScale}
            min={0.1}
            max={5}
            step={0.1}
            onChange={onImageScaleChange}
            info="Scale < 1: Image tiles/repeats"
          />
        </Section>
      )}

      {/* Array Settings */}
      <Section title="Array Settings">
        <Slider
          label="Number of Ribs"
          value={params.count}
          min={10}
          max={80}
          step={1}
          onChange={(v) => updateParam('count', v)}
        />
        <Slider
          label="Spacing (center to center)"
          value={params.spacing}
          min={1}
          max={50}
          step={0.5}
          format={(v) => `${v}"`}
          onChange={(v) => updateParam('spacing', v)}
        />
      </Section>

      {/* Rib Dimensions */}
      <Section title="Rib Dimensions">
        <Slider
          label="Rib Height"
          value={params.height}
          min={40}
          max={144}
          step={1}
          format={(v) => `${v}"`}
          onChange={(v) => updateParam('height', v)}
        />
        <Slider
          label="Min Depth (from wall)"
          value={params.minDepth}
          min={2}
          max={30}
          step={0.5}
          format={(v) => `${v}"`}
          onChange={(v) => updateParam('minDepth', v)}
        />
        <Slider
          label="Max Depth (from wall)"
          value={params.maxDepth}
          min={2}
          max={30}
          step={0.5}
          format={(v) => `${v}"`}
          onChange={(v) => updateParam('maxDepth', v)}
        />
      </Section>

      {/* Wave Pattern (hidden when image loaded) */}
      {!hasImageData() && (
        <Section title="Wave Pattern">
          <Slider
            label="Wave Frequency"
            value={params.frequency}
            min={0.5}
            max={5}
            step={0.5}
            onChange={(v) => updateParam('frequency', v)}
          />
          <Slider
            label="Phase Offset"
            value={params.phase}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => updateParam('phase', v)}
          />
          <Slider
            label="Wave Type"
            value={params.waveType}
            min={0}
            max={2}
            step={1}
            format={(v) => WAVE_TYPES[v]}
            onChange={(v) => updateParam('waveType', v)}
          />
        </Section>
      )}

      {/* Installation Mode */}
      <Section title="Installation Mode">
        <div className="flex gap-1 bg-[#2a2a30] rounded-md p-[3px]">
          {(['wall', 'ceiling', 'both'] as InstallationMode[]).map((mode) => (
            <button
              key={mode}
              className={`flex-1 py-2 px-3 text-[11px] rounded transition-all ${
                installationMode === mode
                  ? 'bg-[#7c9bff] text-white'
                  : 'bg-transparent text-[#888] hover:bg-[#3a3a42] hover:text-[#ccc]'
              }`}
              onClick={() => onInstallationModeChange(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        {installationMode === 'both' && (
          <div className="mt-2">
            <Slider
              label="Ceiling Run"
              value={params.ceilingRun}
              min={24}
              max={144}
              step={1}
              format={(v) => `${v}"`}
              onChange={(v) => updateParam('ceilingRun', v)}
            />
          </div>
        )}
      </Section>

      {/* View */}
      <Section title="View">
        <div className="flex gap-1.5 mb-2">
          {['front', 'top', 'side', 'perspective'].map((view) => (
            <button
              key={view}
              className="flex-1 py-2 text-[11px] rounded-md bg-[#4a4a52] hover:bg-[#5a5a62] text-white font-medium transition-colors"
              onClick={() => (window as any).__ribmakerSetView?.(view)}
            >
              {view === 'perspective' ? '3D' : view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
        <div className="mb-3">
          <label className="block mb-1.5 text-xs text-[#ccc]">Rib Color</label>
          <input
            type="color"
            className="w-full h-9 border-none rounded cursor-pointer bg-transparent"
            value={params.color}
            onChange={(e) => updateParam('color', e.target.value)}
          />
        </div>
        <div className="mb-3">
          <Toggle label="Wallpaper" checked={wallpaperEnabled} onChange={onWallpaperEnabledChange} />
          {wallpaperEnabled && (
            <div className="rounded-md overflow-hidden border border-[#555] mt-1">
              <img src="/wallpapers/bluewallpaper.png" alt="Wallpaper" className="w-full h-14 object-cover" />
            </div>
          )}
        </div>
        {!wallpaperEnabled && (
          <div className="mb-3">
            <label className="block mb-1.5 text-xs text-[#ccc]">Wall/Ceiling Color</label>
            <input
              type="color"
              className="w-full h-9 border-none rounded cursor-pointer bg-transparent"
              value={backdropColor}
              onChange={(e) => onBackdropColorChange(e.target.value)}
            />
          </div>
        )}
        <div className="mb-3">
          <label className="block mb-1.5 text-xs text-[#ccc]">Background Color</label>
          <input
            type="color"
            className="w-full h-9 border-none rounded cursor-pointer bg-transparent"
            value={bgColor}
            onChange={(e) => onBgColorChange(e.target.value)}
          />
        </div>
      </Section>

      {/* Lighting */}
      <Section title="Lighting">
        <div className="grid grid-cols-2 gap-1.5">
          {(['standard', 'dramatic', 'sunset', 'cool', 'night'] as LightingPreset[]).map((preset) => (
            <button
              key={preset}
              className={`py-2 px-1.5 text-[10px] rounded-md font-medium transition-colors ${
                lightingPreset === preset
                  ? 'bg-[#7c9bff] text-white'
                  : 'bg-[#4a4a52] hover:bg-[#5a5a62] text-white'
              }`}
              onClick={() => onLightingPresetChange(preset)}
            >
              {preset === 'cool' ? 'Cool Studio' : preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-[#555]">
          <Toggle label="LED Strip Lighting" checked={ledEnabled} onChange={onLedEnabledChange} />

          {ledEnabled && (
            <div>
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-[#888] mb-1">LED Start Color</label>
                  <input
                    type="color"
                    className="w-full h-[30px] border-none rounded cursor-pointer bg-transparent"
                    value={ledColorStart}
                    onChange={(e) => onLedColorStartChange(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-[#888] mb-1">LED End Color</label>
                  <input
                    type="color"
                    className="w-full h-[30px] border-none rounded cursor-pointer bg-transparent"
                    value={ledColorEnd}
                    onChange={(e) => onLedColorEndChange(e.target.value)}
                  />
                </div>
              </div>
              <Slider
                label="LED Intensity"
                value={ledIntensity}
                min={0.1}
                max={3}
                step={0.1}
                onChange={onLedIntensityChange}
              />
            </div>
          )}
        </div>
      </Section>

      {/* Advanced Settings toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full mt-1 mb-2 py-2 text-[11px] font-semibold text-[#888] hover:text-white uppercase tracking-wider transition-colors"
      >
        {showAdvanced ? '▲ Hide Advanced Settings' : '▼ Show Advanced Settings'}
      </button>

      {showAdvanced && (
        <>
          {/* Curve Settings */}
          <Section title="Curve Settings" defaultOpen={false}>
            <Slider
              label="Control Points"
              value={params.controlPoints}
              min={5}
              max={100}
              step={1}
              onChange={(v) => updateParam('controlPoints', v)}
              info="Points sampled to define curve shape"
            />
            <Slider
              label="Display Resolution"
              value={params.displayResolution}
              min={50}
              max={500}
              step={10}
              onChange={(v) => updateParam('displayResolution', v)}
              info="Segments for smooth curve rendering"
            />
            <div className="bg-[#1a1a1f] p-2 rounded text-[10px] text-[#666] mt-2.5">
              Control spacing: <span className="text-[#7c9bff]">{curveControlSpacing.toFixed(2)}</span>" |
              Segment size: <span className="text-[#7c9bff]">{curveSegmentSize.toFixed(3)}</span>"
            </div>
          </Section>

          {/* Floor */}
          <Section title="Floor" defaultOpen={false}>
            <Toggle label="Wood Floor" checked={floorEnabled} onChange={onFloorEnabledChange} />
          </Section>

          {/* Scale Reference */}
          <Section title="Scale Reference" defaultOpen={false}>
            <Toggle
              label="Person for Scale"
              checked={scaleFigureEnabled}
              onChange={onScaleFigureEnabledChange}
            />
            <p className="text-[10px] text-[#666] mt-1">5'8" figure. Drag to reposition.</p>
          </Section>

          {/* Controls info */}
          <div className="bg-[#1a1a1f] rounded-md p-2.5 mt-3 text-[10px] text-[#666] leading-relaxed">
            <strong className="text-[#999]">Controls:</strong> Left-click drag to rotate, right-click to pan, scroll to zoom.
          </div>
        </>
      )}

      {/* Installation Guide Modal */}
      {installOpen && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999]"
          onClick={() => setInstallOpen(false)}
        >
          <div
            className="relative bg-[#1a1a1f] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-[92vw] max-w-[900px] h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3a3a42]">
              <div>
                <div className="text-[16px] font-bold text-white">Installation Guide</div>
                <div className="text-[11px] text-[#888] mt-0.5">M|R Ribs · Mechanical assembly</div>
              </div>
              <button
                onClick={() => setInstallOpen(false)}
                className="w-9 h-9 rounded-md text-white bg-[#3a3a42] hover:bg-[#5a5a62] border border-[#5a5a62] flex items-center justify-center text-2xl leading-none font-bold"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="mb-8">
                <div className="text-[#7c9bff] font-bold text-[13px] mb-1">STEP 1.1</div>
                <div className="text-white font-semibold mb-2">Fin into channel</div>
                <p className="text-[#ccc] text-[12px] leading-relaxed mb-3">
                  Align the channel with the "L"-shaped engraving on the fin and firmly press the fin
                  into the channel until the slots line up with the holes in the channel. Grip strips
                  applied between the slots ensure a snug fit. The first hole on the channel is 4"
                  from the top.
                </p>
                <img
                  src="/installation/Rib%20detail2.png"
                  alt="Step 1.1 — fin into channel"
                  className="w-full rounded border border-[#3a3a42] bg-white"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

              <div className="mb-8">
                <div className="text-[#7c9bff] font-bold text-[13px] mb-1">STEP 1.2</div>
                <div className="text-white font-semibold mb-2">L-bracket fastening</div>
                <p className="text-[#ccc] text-[12px] leading-relaxed mb-3">
                  Align the slot on the shorter flange of the L-bracket with the hole on the channel
                  on both sides. Use the provided nuts and bolts to secure the group together, then
                  fasten the fin to the channel through the remaining holes.
                </p>
                <img
                  src="/installation/RIB%20Detail.png"
                  alt="Step 1.2 — L-bracket fastening"
                  className="w-full rounded border border-[#3a3a42] bg-white"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

              <div className="mb-4">
                <div className="text-[#7c9bff] font-bold text-[13px] mb-1">DETAIL A</div>
                <div className="text-white font-semibold mb-2">Bracket close-up</div>
                <p className="text-[#ccc] text-[12px] leading-relaxed mb-3">
                  Detail view of the L-bracket secured through the channel slot.
                </p>
                <img
                  src="/installation/Rib%20CU%20detail.png"
                  alt="Detail A — bracket close-up"
                  className="w-full rounded border border-[#3a3a42] bg-white"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

              <div className="mt-6 p-4 rounded-md bg-[#2a2a30] border border-[#3a3a42]">
                <div className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">Included Hardware</div>
                <ul className="text-[12px] text-[#ccc] space-y-1 list-disc list-inside">
                  <li>Aluminum U-channel (mounted to wall first)</li>
                  <li>L-brackets, nuts &amp; bolts (qty per rib)</li>
                  <li>Each rib labeled &amp; etched for placement</li>
                  <li>Materials &amp; install map included with shipment</li>
                  <li>Exterior-rated assembly</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render Result Modal */}
      {renderResult && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] cursor-pointer"
          onClick={() => setRenderResult(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={renderResult}
              alt="Photorealistic Render"
              className="max-w-[90vw] max-h-[85vh] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            />
            <div className="flex gap-2 justify-center mt-3">
              <button
                onClick={handleDownloadRender}
                className="px-6 py-2.5 bg-[#7c9bff] text-white rounded-md text-[13px] font-semibold cursor-pointer border-none"
              >
                Download
              </button>
              <button
                onClick={() => setRenderResult(null)}
                className="px-6 py-2.5 bg-[#4a4a52] text-white border-none rounded-md text-[13px] font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

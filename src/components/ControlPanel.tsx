import { useState, useCallback } from 'react';
import type {
  RibParams,
  InstallationMode,
  LightingPreset,
} from '../engine/types';
import { WAVE_TYPES } from '../engine/types';
import { loadImageData, clearImageData, hasImageData } from '../engine/ribEngine';

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
  scaleFigureEnabled: boolean;
  onScaleFigureEnabledChange: (enabled: boolean) => void;
  imageScale: number;
  onImageScaleChange: (scale: number) => void;
  onImageModeChange: (hasImage: boolean) => void;
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
    <div className="bg-[#3a3a42] rounded-lg mb-3.5">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs font-semibold text-[#aaa] uppercase tracking-wide">{title}</span>
        <span className="text-[#666] text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
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
    <div className="mb-3 last:mb-0">
      <label className="flex justify-between mb-1.5 text-xs text-[#ccc]">
        {label}
        <span className="text-[#7c9bff] font-medium font-mono">
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
      {info && <p className="text-[10px] text-[#666] mt-1">{info}</p>}
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
    scaleFigureEnabled,
    onScaleFigureEnabledChange,
    imageScale,
    onImageScaleChange,
    onImageModeChange,
  } = props;

  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);

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
      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="text-[22px] font-bold tracking-tight">
          M<span className="text-[#7c9bff] mx-0.5">|</span>R Walls
        </div>
      </div>
      <h1 className="text-[15px] font-medium text-[#aaa]">Rib Maker</h1>
      <p className="text-[11px] text-[#666] mb-4">Architectural facade panel designer</p>

      {/* Mode indicator */}
      <div
        className={`px-3 py-2 rounded-md text-[11px] text-center font-medium mb-3.5 ${
          hasImageData()
            ? 'bg-[#2d4a3d] text-[#4ade80]'
            : 'bg-[#3a3a52] text-[#7c9bff]'
        }`}
      >
        Mode: {hasImageData() ? 'Image Pattern' : 'Wave Pattern'}
      </div>

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
        {imagePreviewSrc && (
          <div className="mt-3">
            <Slider
              label="Image Scale"
              value={imageScale}
              min={0.1}
              max={5}
              step={0.1}
              onChange={onImageScaleChange}
              info="Scale < 1: Image tiles/repeats"
            />
          </div>
        )}
      </Section>

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
        <div className="mb-3 last:mb-0">
          <label className="block mb-1.5 text-xs text-[#ccc]">Rib Thickness</label>
          <select
            className="w-full p-2 border-none rounded bg-[#555] text-white text-xs cursor-pointer"
            value={params.thickness}
            onChange={(e) => updateParam('thickness', parseFloat(e.target.value))}
          >
            <option value="0.5">0.5 inch</option>
            <option value="1">1 inch</option>
          </select>
        </div>
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

      {/* Floor */}
      <Section title="Floor" defaultOpen={false}>
        <Toggle label="Wood Floor" checked={floorEnabled} onChange={onFloorEnabledChange} />
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
          <label className="block mb-1.5 text-xs text-[#ccc]">Wall/Ceiling Color</label>
          <input
            type="color"
            className="w-full h-9 border-none rounded cursor-pointer bg-transparent"
            value={backdropColor}
            onChange={(e) => onBackdropColorChange(e.target.value)}
          />
        </div>
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
      <div className="bg-[#1a1a1f] rounded-md p-2.5 mt-3.5 text-[11px] text-[#666] leading-relaxed">
        <strong className="text-[#aaa]">Controls:</strong> Left-click drag to rotate, right-click drag to pan, scroll to zoom.
      </div>
    </div>
  );
}

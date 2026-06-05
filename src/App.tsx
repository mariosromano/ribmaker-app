import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type {
  RibParams,
  RibProfile,
  InstallationMode,
  LightingPreset,
} from './engine/types';
import { calculatePricing, loadImageFromUrl } from './engine/ribEngine';
import Viewport3D from './components/Viewport3D';
import ControlPanel from './components/ControlPanel';
import ExportBar from './components/ExportBar';
import ChatPanel from './components/ChatPanel';
import Gallery from './components/Gallery';
import InstallationGuide from './components/InstallationGuide';
import { track } from './analytics';

const DEFAULT_PARAMS: RibParams = {
  height: 144,
  minDepth: 2,
  maxDepth: 6,
  thickness: 0.5,
  count: 30,
  spacing: 5,
  frequency: 2,
  phase: 0.25,
  waveType: 0,
  controlPoints: 20,
  displayResolution: 200,
  color: '#ffffff',
  ceilingRun: 96,
};

interface RightPanelProps {
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
  ribProfiles: RibProfile[];
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  onOpenAskMara: () => void;
  onOpenGallery: () => void;
  onOpenInstall: () => void;
  onEnterPresentation: () => void;
  panelWidth: number;
}

function RightPanel(props: RightPanelProps) {
  const {
    params, onParamsChange, installationMode, onInstallationModeChange,
    lightingPreset, onLightingPresetChange, ledEnabled, onLedEnabledChange,
    ledColorStart, onLedColorStartChange, ledColorEnd, onLedColorEndChange,
    ledIntensity, onLedIntensityChange, backdropColor, onBackdropColorChange,
    bgColor, onBgColorChange, floorEnabled, onFloorEnabledChange,
    wallpaperEnabled, onWallpaperEnabledChange, scaleFigureEnabled,
    onScaleFigureEnabledChange, imageScale, onImageScaleChange,
    onImageModeChange, ribProfiles, rendererRef, sceneRef, cameraRef,
    onOpenAskMara, onOpenGallery, onOpenInstall, onEnterPresentation, panelWidth,
  } = props;

  const pricing = useMemo(
    () => calculatePricing(params, installationMode, ledEnabled),
    [params, installationMode, ledEnabled]
  );
  const fmtPrice = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div
      className="bg-[var(--surface-1)] h-screen overflow-y-auto py-5 px-5 flex flex-col border-l border-[var(--line)]"
      style={{ width: panelWidth, minWidth: panelWidth }}
    >
      <div className="flex-1">
        {/* Brand */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <div className="text-[19px] font-semibold tracking-tight leading-none text-[var(--ink)]">
              M<span className="text-[var(--gold)]">|</span>R Walls
            </div>
            <div className="text-[10px] font-medium text-[var(--ink-muted)] font-mono tracking-[0.2em] uppercase">Fin Maker</div>
          </div>
          <button
            onClick={onEnterPresentation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--gold-bright)] hover:bg-[var(--surface-2)] transition-colors text-[10.5px] font-medium"
            title="Presentation mode — full-screen preview"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
            Present
          </button>
        </div>

        {/* Action toolbar: three peer references — see built work, learn install, talk to Mara */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={onOpenGallery}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--ink-soft)] text-[10.5px] font-medium transition-colors border border-[var(--line)]"
            title="See built work"
          >
            <span className="text-[15px] leading-none text-[var(--ink-muted)]">▦</span>
            Gallery
          </button>
          <button
            onClick={onOpenInstall}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--ink-soft)] text-[10.5px] font-medium transition-colors border border-[var(--line)]"
            title="Step-by-step assembly drawings"
          >
            <span className="text-[15px] leading-none text-[var(--ink-muted)]">⚙</span>
            Install
          </button>
          <button
            onClick={onOpenAskMara}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-[#1a1a14] text-[10.5px] font-semibold bg-gradient-to-br from-[var(--gold-bright)] to-[var(--gold)] shadow-[0_2px_14px_rgba(201,169,106,0.28)] hover:brightness-105 transition-all"
            title="AI design concierge"
          >
            <span className="w-5 h-5 rounded-full bg-black/15 flex items-center justify-center text-[11px] font-bold leading-none">M</span>
            Ask Mara
          </button>
        </div>

        {/* Quick summary — at-a-glance spec + price */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 mb-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] text-[var(--ink-muted)] mb-1 uppercase tracking-wider">Fins</div>
              <div className="text-[var(--ink)] font-semibold text-[15px]">{params.count}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--ink-muted)] mb-1 uppercase tracking-wider">Height</div>
              <div className="text-[var(--ink)] font-semibold text-[15px]">{Math.floor(params.height / 12)}′</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--ink-muted)] mb-1 uppercase tracking-wider">Depth</div>
              <div className="text-[var(--ink)] font-semibold text-[15px]">{params.maxDepth}″</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-[var(--line)]">
            <div>
              <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Est. Investment</span>
              <div className="text-[20px] font-semibold text-[var(--ink)] font-mono leading-tight mt-0.5">{fmtPrice(pricing.totalPrice)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--ink-muted)]">Scale figure</span>
              <label className="relative w-10 h-[22px] cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={scaleFigureEnabled}
                  onChange={(e) => onScaleFigureEnabledChange(e.target.checked)}
                />
                <div className="w-10 h-[22px] bg-[var(--surface-4)] rounded-full peer-checked:bg-[var(--gold)] transition-colors" />
                <div className="absolute left-[3px] bottom-[3px] w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-[18px] shadow-sm" />
              </label>
            </div>
          </div>
        </div>

        {/* Full ControlPanel — always visible */}
        <ControlPanel
            params={params}
            onParamsChange={onParamsChange}
            installationMode={installationMode}
            onInstallationModeChange={onInstallationModeChange}
            lightingPreset={lightingPreset}
            onLightingPresetChange={onLightingPresetChange}
            ledEnabled={ledEnabled}
            onLedEnabledChange={onLedEnabledChange}
            ledColorStart={ledColorStart}
            onLedColorStartChange={onLedColorStartChange}
            ledColorEnd={ledColorEnd}
            onLedColorEndChange={onLedColorEndChange}
            ledIntensity={ledIntensity}
            onLedIntensityChange={onLedIntensityChange}
            backdropColor={backdropColor}
            onBackdropColorChange={onBackdropColorChange}
            bgColor={bgColor}
            onBgColorChange={onBgColorChange}
            floorEnabled={floorEnabled}
            onFloorEnabledChange={onFloorEnabledChange}
            wallpaperEnabled={wallpaperEnabled}
            onWallpaperEnabledChange={onWallpaperEnabledChange}
            scaleFigureEnabled={scaleFigureEnabled}
            onScaleFigureEnabledChange={onScaleFigureEnabledChange}
            imageScale={imageScale}
            onImageScaleChange={onImageScaleChange}
            onImageModeChange={onImageModeChange}
            rendererRef={rendererRef}
            sceneRef={sceneRef}
            cameraRef={cameraRef}
          />

        <ExportBar
          params={params}
          ribProfiles={ribProfiles}
          installationMode={installationMode}
          ledEnabled={ledEnabled}
          rendererRef={rendererRef}
          sceneRef={sceneRef}
          cameraRef={cameraRef}
        />

        {/* Studio CTA — for projects that exceed the configurator's range */}
        <div className="mt-4 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--line)]">
          <div className="text-[12.5px] font-semibold text-[var(--ink)] mb-1.5">
            Need something bespoke?
          </div>
          <p className="text-[11.5px] text-[var(--ink-muted)] leading-relaxed mb-3">
            Our studio handles custom shapes, oversized installs, and full design collaboration.
          </p>
          <a
            href="mailto:orders@marioromano.com?subject=Custom%20Fin%20Project%20Inquiry&body=Hi%20M%7CR%20Studio%2C%0A%0AI%27m%20working%20on%20a%20project%20that%20goes%20beyond%20the%20standard%20configurator.%20Here%27s%20what%20I%27m%20trying%20to%20achieve%3A%0A%0A%5BDescribe%20your%20project%5D%0A%0AThanks%2C"
            onClick={() => track('studio_contact_clicked')}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-center text-[12px] font-semibold text-[var(--gold-bright)] border border-[var(--gold-deep)]/40 hover:bg-[var(--gold)]/10 transition-colors"
          >
            Talk to M|R Studio
            <span className="text-[13px]">→</span>
          </a>
        </div>

        {/* Footer — legal */}
        <div className="mt-3.5 text-[10px] text-[var(--ink-faint)] text-center">
          <a
            href="https://mrwalls.io/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--ink-muted)] transition-colors"
          >
            Privacy Policy
          </a>
          <span className="mx-1.5">·</span>
          <span>© M|R Walls</span>
        </div>

      </div>
    </div>
  );
}

export default function App() {
  const [params, setParams] = useState<RibParams>(DEFAULT_PARAMS);
  const [installationMode, setInstallationMode] = useState<InstallationMode>('wall');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('standard');
  const [ledEnabled, setLedEnabled] = useState(false);
  const [ledColorStart, setLedColorStart] = useState('#ff0066');
  const [ledColorEnd, setLedColorEnd] = useState('#00ffff');
  const [ledIntensity, setLedIntensity] = useState(1.0);
  const [backdropColor, setBackdropColor] = useState('#3a3a40');
  const [bgColor, setBgColor] = useState('#1a1a1f');
  const [floorEnabled, setFloorEnabled] = useState(true);
  const [wallpaperEnabled, setWallpaperEnabled] = useState(false);
  const [scaleFigureEnabled, setScaleFigureEnabled] = useState(true);
  const [imageScale, setImageScale] = useState(1.0);
  const [ribProfiles, setRibProfiles] = useState<RibProfile[]>([]);
  const [, setHasImage] = useState(false);

  const [askMaraOpen, setAskMaraOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

  // Exit presentation mode on Escape
  useEffect(() => {
    if (!presentationMode) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPresentationMode(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [presentationMode]);

  // Resizable panel — drag the left-edge handle to resize 280..500px
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 340;
    const saved = parseInt(localStorage.getItem('ribmaker_panel_width') || '', 10);
    return Number.isFinite(saved) && saved >= 280 && saved <= 500 ? saved : 340;
  });
  useEffect(() => {
    localStorage.setItem('ribmaker_panel_width', String(panelWidth));
  }, [panelWidth]);
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = panelWidth;
    const onMove = (ev: MouseEvent) => {
      const dx = startX - ev.clientX; // dragging left widens
      setPanelWidth(Math.max(280, Math.min(500, startWidth + dx)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const handleRibProfilesGenerated = useCallback((profiles: RibProfile[]) => {
    setRibProfiles(profiles);
  }, []);

  const handleImageModeChange = useCallback((has: boolean) => {
    setHasImage(has);
    setParams((p) => ({ ...p }));
  }, []);

  // Auto-load Rings pattern on first mount so the landing wall has the
  // signature radial-wave look out of the gate.
  useEffect(() => {
    loadImageFromUrl('/patterns/rings.png')
      .then(() => handleImageModeChange(true))
      .catch(() => {});
  }, [handleImageModeChange]);

  return (
    <div className="flex w-screen h-screen">
      {/* Center: 3D Viewport — hero area */}
      <Viewport3D
        params={params}
        installationMode={installationMode}
        lightingPreset={lightingPreset}
        ledEnabled={ledEnabled}
        ledColorStart={ledColorStart}
        ledColorEnd={ledColorEnd}
        ledIntensity={ledIntensity}
        backdropColor={backdropColor}
        bgColor={bgColor}
        floorEnabled={floorEnabled}
        wallpaperEnabled={wallpaperEnabled}
        scaleFigureEnabled={scaleFigureEnabled}
        imageScale={imageScale}
        onRibProfilesGenerated={handleRibProfilesGenerated}
        rendererRef={rendererRef}
        sceneRef={sceneRef}
        cameraRef={cameraRef}
      />

      {/* Presentation mode: floating pill to exit, panels hidden */}
      {presentationMode && (
        <button
          onClick={() => setPresentationMode(false)}
          className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--surface-1)]/90 backdrop-blur border border-[var(--line-strong)] text-[var(--ink-soft)] text-[12px] font-medium hover:text-[var(--ink)] hover:border-[var(--gold-deep)] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)] animate-fade-in-up"
          title="Exit presentation (Esc)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          Exit Presentation
        </button>
      )}

      {/* Right: drag-handle + Controls panel — hidden in presentation mode */}
      {!presentationMode && (
      <div
        onMouseDown={handleResizeStart}
        className="w-1 hover:w-1.5 hover:bg-[var(--gold)] cursor-ew-resize transition-all shrink-0"
        title="Drag to resize"
      />
      )}
      {!presentationMode && (
      <RightPanel
        params={params}
        onParamsChange={setParams}
        installationMode={installationMode}
        onInstallationModeChange={setInstallationMode}
        lightingPreset={lightingPreset}
        onLightingPresetChange={setLightingPreset}
        ledEnabled={ledEnabled}
        onLedEnabledChange={setLedEnabled}
        ledColorStart={ledColorStart}
        onLedColorStartChange={setLedColorStart}
        ledColorEnd={ledColorEnd}
        onLedColorEndChange={setLedColorEnd}
        ledIntensity={ledIntensity}
        onLedIntensityChange={setLedIntensity}
        backdropColor={backdropColor}
        onBackdropColorChange={setBackdropColor}
        bgColor={bgColor}
        onBgColorChange={setBgColor}
        floorEnabled={floorEnabled}
        onFloorEnabledChange={setFloorEnabled}
        wallpaperEnabled={wallpaperEnabled}
        onWallpaperEnabledChange={setWallpaperEnabled}
        scaleFigureEnabled={scaleFigureEnabled}
        onScaleFigureEnabledChange={setScaleFigureEnabled}
        imageScale={imageScale}
        onImageScaleChange={setImageScale}
        onImageModeChange={handleImageModeChange}
        ribProfiles={ribProfiles}
        rendererRef={rendererRef}
        sceneRef={sceneRef}
        cameraRef={cameraRef}
        onOpenAskMara={() => { setAskMaraOpen(true); track('mara_opened'); }}
        onOpenGallery={() => { setGalleryOpen(true); track('gallery_opened'); }}
        onOpenInstall={() => { setInstallOpen(true); track('install_guide_opened'); }}
        onEnterPresentation={() => { setPresentationMode(true); track('presentation_mode_entered'); }}
        panelWidth={panelWidth}
      />
      )}

      <Gallery open={galleryOpen} onClose={() => setGalleryOpen(false)} />
      <InstallationGuide open={installOpen} onClose={() => setInstallOpen(false)} />

      {/* Ask Mara drawer — fixed overlay, only mounted when open */}
      {askMaraOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setAskMaraOpen(false)}
          />
          <div className="fixed top-0 right-0 h-screen z-50" style={{ width: 420 }}>
            <ChatPanel
              params={params}
              onParamsChange={setParams}
              onInstallationModeChange={setInstallationMode}
              onLightingPresetChange={setLightingPreset}
              onLedEnabledChange={setLedEnabled}
              onLedColorStartChange={setLedColorStart}
              onLedColorEndChange={setLedColorEnd}
              onLedIntensityChange={setLedIntensity}
              onBackdropColorChange={setBackdropColor}
              onBgColorChange={setBgColor}
              onImageScaleChange={setImageScale}
              onImageModeChange={handleImageModeChange}
              onScaleFigureEnabledChange={setScaleFigureEnabled}
              onFloorEnabledChange={setFloorEnabled}
              rendererRef={rendererRef}
              sceneRef={sceneRef}
              cameraRef={cameraRef}
              isFloating={false}
              sidebarReady={true}
              isDrawer
              isOpen={true}
              onClose={() => setAskMaraOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}

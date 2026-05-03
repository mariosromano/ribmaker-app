import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type {
  RibParams,
  RibProfile,
  InstallationMode,
  LightingPreset,
} from './engine/types';
import { calculatePricing } from './engine/ribEngine';
import Viewport3D from './components/Viewport3D';
import ControlPanel from './components/ControlPanel';
import InfoBar from './components/InfoBar';
import ExportBar from './components/ExportBar';
import ChatPanel from './components/ChatPanel';

const DEFAULT_PARAMS: RibParams = {
  height: 144,
  minDepth: 4,
  maxDepth: 12,
  thickness: 0.5,
  count: 40,
  spacing: 7,
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
    onOpenAskMara, panelWidth,
  } = props;

  const pricing = useMemo(
    () => calculatePricing(params, installationMode, ledEnabled),
    [params, installationMode, ledEnabled]
  );
  const fmtPrice = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div
      className="bg-[#2a2a30] h-screen overflow-y-auto py-5 px-6 flex flex-col"
      style={{ width: panelWidth, minWidth: panelWidth }}
    >
      <div className="flex-1">
        {/* Brand + Ask Mara button */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[18px] font-bold tracking-tight leading-tight text-[#d4af37]">
              MAKE REAL
            </div>
            <div className="text-[11px] font-medium text-[#888] mt-0.5 font-mono tracking-widest uppercase">Rib Maker</div>
          </div>
          <button
            onClick={onOpenAskMara}
            className="px-3.5 py-2 rounded-full text-[12px] font-semibold text-white bg-gradient-to-br from-[#d4af37] to-[#b8941f] shadow-[0_2px_10px_rgba(212,175,55,0.35)] hover:brightness-110 transition-all flex items-center gap-1.5"
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">M</span>
            Ask Mara
          </button>
        </div>

        {/* Price card */}
        <div className="bg-[#2d4a2d] rounded-lg px-3 py-2 text-right mb-3 flex items-center justify-between">
          <div className="text-[9px] text-[#8eff8e]/70 uppercase tracking-wider">Est. Price</div>
          <div className="text-[17px] font-bold text-[#8eff8e] leading-none font-mono">{fmtPrice(pricing.totalPrice)}</div>
        </div>

        {/* Quick summary (always visible) */}
        <div className="bg-[#3a3a42] rounded-lg p-4 mb-3">
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div>
              <div className="text-[#888] mb-0.5">Ribs</div>
              <div className="text-white font-bold text-sm">{params.count}</div>
            </div>
            <div>
              <div className="text-[#888] mb-0.5">Height</div>
              <div className="text-white font-bold text-sm">{params.height}"</div>
            </div>
            <div>
              <div className="text-[#888] mb-0.5">Depth</div>
              <div className="text-white font-bold text-sm">{params.maxDepth}"</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#4a4a52]">
            <span className="text-[11px] text-[#ccc]">Scale Figure</span>
            <label className="relative w-11 h-6 cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={scaleFigureEnabled}
                onChange={(e) => onScaleFigureEnabledChange(e.target.checked)}
              />
              <div className="w-11 h-6 bg-[#555] rounded-full peer-checked:bg-[#7c9bff] transition-colors" />
              <div className="absolute left-[3px] bottom-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </label>
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

        <InfoBar
          params={params}
          installationMode={installationMode}
          ledEnabled={ledEnabled}
        />
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

  // Control-panel layout state — resizable in wide mode, overlay drawer in narrow
  const NARROW_BREAKPOINT = 1100;
  const [overlayOpen, setOverlayOpen] = useState(false); // narrow-window only
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 340;
    const saved = parseInt(localStorage.getItem('ribmaker_panel_width') || '', 10);
    return Number.isFinite(saved) && saved >= 280 && saved <= 500 ? saved : 340;
  });
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < NARROW_BREAKPOINT : false,
  );
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => {
    localStorage.setItem('ribmaker_panel_width', String(panelWidth));
  }, [panelWidth]);
  // Clear any old "panel collapsed" preference from the previous version
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.removeItem('ribmaker_panel_open');
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = panelWidth;
    const onMove = (ev: MouseEvent) => {
      const dx = startX - ev.clientX; // dragging left widens
      const next = Math.max(280, Math.min(500, startWidth + dx));
      setPanelWidth(next);
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

      {/* Right: Controls panel — always docked in wide mode, with resize handle */}
      {!isNarrow && (
        <div className="relative flex shrink-0">
          <div
            onMouseDown={handleResizeStart}
            className="w-1 hover:w-1.5 hover:bg-[#7c9bff] cursor-ew-resize transition-all"
            title="Drag to resize"
          />
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
            onOpenAskMara={() => setAskMaraOpen(true)}
            panelWidth={panelWidth}
          />
        </div>
      )}

      {/* Narrow window: floating button to open panel as overlay */}
      {isNarrow && !overlayOpen && (
        <button
          onClick={() => setOverlayOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-br from-[#d4af37] to-[#b8941f] text-white rounded-full px-5 py-3 shadow-[0_4px_20px_rgba(212,175,55,0.4)] z-40 font-semibold text-sm flex items-center gap-2"
        >
          <span className="text-base">⚙</span> Controls
        </button>
      )}

      {/* Narrow window: panel as fixed overlay */}
      {isNarrow && overlayOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setOverlayOpen(false)}
          />
          <div className="fixed top-0 right-0 h-screen z-50 shadow-[-8px_0_32px_rgba(0,0,0,0.4)]">
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
              onOpenAskMara={() => setAskMaraOpen(true)}
              panelWidth={Math.min(panelWidth, 360)}
            />
          </div>
        </>
      )}

      {/* Ask Mara drawer — fixed overlay, only mounted when open */}
      {askMaraOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setAskMaraOpen(false)}
          />
          <div className="fixed top-0 right-0 h-screen z-50" style={{ width: 380 }}>
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

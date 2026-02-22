import { useState, useCallback, useRef, useMemo } from 'react';
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
  showAdvanced: boolean;
  onShowAdvancedChange: (show: boolean) => void;
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
    showAdvanced, onShowAdvancedChange,
  } = props;

  const pricing = useMemo(
    () => calculatePricing(params, installationMode, ledEnabled),
    [params, installationMode, ledEnabled]
  );
  const fmtPrice = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="w-[340px] min-w-[340px] bg-[#2a2a30] h-screen overflow-y-auto py-5 px-6 flex flex-col">
      <div className="flex-1">
        {/* Brand + Price (always visible) */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[20px] font-bold tracking-tight leading-tight">
              M<span className="text-[#7c9bff] mx-0.5">|</span>R Walls
            </div>
            <div className="text-[13px] font-medium text-[#aaa] mt-0.5">Rib Maker</div>
          </div>
          <div className="bg-[#2d4a2d] rounded-lg px-3 py-2 text-right shrink-0 ml-3">
            <div className="text-[8px] text-[#8eff8e]/60 uppercase tracking-wider leading-none mb-1">Est. Price</div>
            <div className="text-[17px] font-bold text-[#8eff8e] leading-none font-mono">{fmtPrice(pricing.totalPrice)}</div>
          </div>
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

        {/* Advanced toggle */}
        <button
          onClick={() => onShowAdvancedChange(!showAdvanced)}
          className={`w-full py-2.5 rounded-lg text-[12px] font-semibold mb-3 transition-colors ${
            showAdvanced
              ? 'bg-[#7c9bff] text-white'
              : 'bg-[#3a3a42] text-[#aaa] hover:text-white hover:bg-[#4a4a52]'
          }`}
        >
          {showAdvanced ? 'Hide Advanced Controls' : 'Advanced Controls'}
        </button>

        {/* Full ControlPanel (only when advanced is open) */}
        {showAdvanced && (
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
          />
        )}

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
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      {/* Left: AI Chat Panel */}
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
      />

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

      {/* Right: Summary + Advanced Controls + Export + Info */}
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
        showAdvanced={showAdvanced}
        onShowAdvancedChange={setShowAdvanced}
      />
    </div>
  );
}

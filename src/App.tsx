import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import type {
  RibParams,
  RibProfile,
  InstallationMode,
  LightingPreset,
} from './engine/types';
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
  const [scaleFigureEnabled, setScaleFigureEnabled] = useState(false);
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
        scaleFigureEnabled={scaleFigureEnabled}
        imageScale={imageScale}
        onRibProfilesGenerated={handleRibProfilesGenerated}
        rendererRef={rendererRef}
        sceneRef={sceneRef}
        cameraRef={cameraRef}
      />

      {/* Right: Control Panel + Export + Info */}
      <div className="w-[340px] min-w-[340px] bg-[#2a2a30] h-screen overflow-y-auto p-5 flex flex-col">
        <div className="flex-1">
          <ControlPanel
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
            scaleFigureEnabled={scaleFigureEnabled}
            onScaleFigureEnabledChange={setScaleFigureEnabled}
            imageScale={imageScale}
            onImageScaleChange={setImageScale}
            onImageModeChange={handleImageModeChange}
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
    </div>
  );
}

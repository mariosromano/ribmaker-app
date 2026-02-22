import { useCallback } from 'react';
import * as THREE from 'three';
import type { RibParams, RibProfile, InstallationMode } from '../engine/types';
import { exportDXF, exportCSV, downloadFile } from '../engine/ribEngine';

interface ExportBarProps {
  params: RibParams;
  ribProfiles: RibProfile[];
  installationMode: InstallationMode;
  ledEnabled: boolean;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}

export default function ExportBar({
  params,
  ribProfiles,
  installationMode,
  ledEnabled,
  rendererRef,
  sceneRef,
  cameraRef,
}: ExportBarProps) {
  const handleExportImage = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = 'mr-walls-ribs.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
  }, [rendererRef, sceneRef, cameraRef]);

  const handleExportDXF = useCallback(() => {
    if (!ribProfiles.length) return;
    const dxf = exportDXF(ribProfiles, params);
    downloadFile(dxf, 'mr-walls-ribs.dxf', 'application/dxf');
  }, [ribProfiles, params]);

  const handleExportCSV = useCallback(() => {
    const csv = exportCSV(params, installationMode, ledEnabled);
    downloadFile(csv, 'mr-walls-ribs.csv', 'text/csv');
  }, [params, installationMode, ledEnabled]);

  return (
    <div className="bg-[#3a3a42] rounded-lg p-4 mb-3">
      <div className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2.5">Export</div>
      <div className="space-y-1.5">
        <button
          className="w-full py-2.5 rounded-md bg-[#7c9bff] hover:bg-[#6b8aee] text-white text-xs font-medium transition-colors"
          onClick={handleExportImage}
        >
          Download Image
        </button>
        <button
          className="w-full py-2.5 rounded-md bg-[#4a4a52] hover:bg-[#5a5a62] text-white text-xs font-medium transition-colors"
          onClick={handleExportDXF}
        >
          Export DXF (All Ribs)
        </button>
        <button
          className="w-full py-2.5 rounded-md bg-[#4a4a52] hover:bg-[#5a5a62] text-white text-xs font-medium transition-colors"
          onClick={handleExportCSV}
        >
          Export Dimensions CSV
        </button>
      </div>
    </div>
  );
}

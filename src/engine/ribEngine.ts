/**
 * RibEngine — PRODUCTION-PROVEN geometry math, DXF export, and CSV export.
 * This code is copied verbatim from the working ribmaker.html.
 * DO NOT MODIFY the math or DXF generation logic.
 */

import * as THREE from 'three';
import type {
  RibParams,
  RibProfile,
  InstallationMode,
} from './types';
import {
  SCALE,
  PRICE_PER_SF,
  PRICE_LED_PER_LF,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  SHEET_PRICE,
  WAVE_TYPES,
} from './types';

// ── Image sampling ──────────────────────────────────────────────────

let imageData: ImageData | null = null;
let imageCanvas: HTMLCanvasElement | null = null;
let imageCtx: CanvasRenderingContext2D | null = null;

export function loadImageData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please upload an image file.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        imageCanvas = document.createElement('canvas');
        imageCanvas.width = img.width;
        imageCanvas.height = img.height;
        imageCtx = imageCanvas.getContext('2d')!;
        imageCtx.drawImage(img, 0, 0);
        imageData = imageCtx.getImageData(0, 0, img.width, img.height);
        resolve(e.target!.result as string);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function loadImageFromUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCanvas = document.createElement('canvas');
      imageCanvas.width = img.width;
      imageCanvas.height = img.height;
      imageCtx = imageCanvas.getContext('2d')!;
      imageCtx.drawImage(img, 0, 0);
      imageData = imageCtx.getImageData(0, 0, img.width, img.height);
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function clearImageData() {
  imageData = null;
  imageCanvas = null;
  imageCtx = null;
}

export function hasImageData(): boolean {
  return imageData !== null;
}

export function sampleImageBrightness(u: number, v: number, imageScale: number): number {
  if (!imageData || !imageCanvas) return 0.5;

  let su = (u / imageScale) % 1;
  let sv = (v / imageScale) % 1;
  if (su < 0) su += 1;
  if (sv < 0) sv += 1;

  const px = Math.floor(su * (imageCanvas.width - 1));
  const py = Math.floor((1 - sv) * (imageCanvas.height - 1));

  const idx = (py * imageCanvas.width + px) * 4;
  const r = imageData.data[idx];
  const g = imageData.data[idx + 1];
  const b = imageData.data[idx + 2];

  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ── Wave functions ──────────────────────────────────────────────────

export function waveFunction(t: number, frequency: number, waveType: number, phaseShift: number): number {
  const angle = t * frequency * Math.PI * 2 + phaseShift;
  switch (waveType) {
    case 0: return Math.sin(angle);
    case 1: return Math.sin(angle) * Math.abs(Math.sin(angle));
    case 2: return Math.asin(Math.sin(angle)) / (Math.PI / 2);
    default: return Math.sin(angle);
  }
}

// ── Control point generation ────────────────────────────────────────

export function generateControlPoints(params: RibParams, ribIndex: number, imageScale: number): THREE.Vector2[] {
  const { height, minDepth, maxDepth, frequency, phase, waveType, controlPoints, count } = params;
  const points: THREE.Vector2[] = [];
  const depthRange = maxDepth - minDepth;
  const phaseShift = ribIndex * phase * Math.PI * 2;

  for (let i = 0; i < controlPoints; i++) {
    const t = i / (controlPoints - 1);
    const y = t * height;

    let depth: number;
    if (imageData) {
      const u = count > 1 ? ribIndex / (count - 1) : 0.5;
      const brightness = sampleImageBrightness(u, t, imageScale);
      depth = minDepth + brightness * depthRange;
    } else {
      const wave = waveFunction(t, frequency, waveType, phaseShift);
      depth = minDepth + (wave + 1) / 2 * depthRange;
    }

    points.push(new THREE.Vector2(depth, y));
  }

  return points;
}

// Generate control points for the full L-path (wall + ceiling)
// totalPath = height + ceilingRun. y spans 0..totalPath continuously.
// t (0..1) is normalized over the full path so wave/image patterns wrap the corner.
export function generateControlPointsLPath(
  params: RibParams,
  ribIndex: number,
  totalPath: number,
  imageScale: number
): THREE.Vector2[] {
  const { minDepth, maxDepth, frequency, phase, waveType, controlPoints, count, height } = params;
  const points: THREE.Vector2[] = [];
  const depthRange = maxDepth - minDepth;
  const phaseShift = ribIndex * phase * Math.PI * 2;
  // Use more control points proportional to total path
  const numPts = Math.round(controlPoints * (totalPath / height));

  for (let i = 0; i < numPts; i++) {
    const t = i / (numPts - 1);
    const y = t * totalPath;

    let depth: number;
    if (imageData) {
      const u = count > 1 ? ribIndex / (count - 1) : 0.5;
      const brightness = sampleImageBrightness(u, t, imageScale);
      depth = minDepth + brightness * depthRange;
    } else {
      const wave = waveFunction(t, frequency, waveType, phaseShift);
      depth = minDepth + (wave + 1) / 2 * depthRange;
    }

    points.push(new THREE.Vector2(depth, y));
  }

  return points;
}

// ── Spline evaluation ───────────────────────────────────────────────

export function evaluateSplineCurve(controlPoints: THREE.Vector2[], resolution: number): THREE.Vector2[] {
  const curve = new THREE.SplineCurve(controlPoints);
  return curve.getPoints(resolution);
}

// ── Rib geometry ────────────────────────────────────────────────────

export function createRibGeometry(profile: THREE.Vector2[], thickness: number, height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();

  shape.moveTo(0, 0);

  profile.forEach((point) => {
    shape.lineTo(point.x * SCALE, point.y * SCALE);
  });

  shape.lineTo(0, height * SCALE);
  shape.lineTo(0, 0);

  const extrudeSettings = {
    depth: thickness * SCALE,
    bevelEnabled: false,
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

// ── Full rib generation (returns profiles) ──────────────────────────

export function generateRibProfiles(
  params: RibParams,
  installationMode: InstallationMode,
  imageScale: number
): { ribProfiles: RibProfile[]; ceilingProfilesArr: THREE.Vector2[][] } {
  const { height, thickness, count, displayResolution } = params;

  // Validate min/max
  const actualMinDepth = Math.min(params.minDepth, params.maxDepth);
  const actualMaxDepth = Math.max(params.minDepth, params.maxDepth);
  params.minDepth = actualMinDepth;
  params.maxDepth = actualMaxDepth;

  const ribProfiles: RibProfile[] = [];
  const ceilingProfilesArr: THREE.Vector2[][] = [];

  for (let i = 0; i < count; i++) {
    let profile: THREE.Vector2[];
    let controlPts: THREE.Vector2[];

    if (installationMode === 'both') {
      const ceilingRun = params.ceilingRun;
      const totalPath = height + ceilingRun;
      const fullControlPoints = generateControlPointsLPath(params, i, totalPath, imageScale);
      const totalRes = Math.round(displayResolution * (totalPath / height));
      const fullProfile = evaluateSplineCurve(fullControlPoints, totalRes);

      // Split at the corner
      const splitIndex = Math.round((height / totalPath) * fullProfile.length);
      profile = fullProfile.slice(0, splitIndex + 1);
      controlPts = fullControlPoints.filter((p) => p.y <= height);

      // Store ceiling segment (remapped to 0..ceilingRun)
      ceilingProfilesArr.push(
        fullProfile.slice(splitIndex).map((p) => new THREE.Vector2(p.x, p.y - height))
      );
    } else {
      controlPts = generateControlPoints(params, i, imageScale);
      profile = evaluateSplineCurve(controlPts, displayResolution);
    }

    ribProfiles.push({
      index: i,
      profile: profile.map((p) => ({ x: p.x, y: p.y })),
      controlPoints: controlPts.map((p) => ({ x: p.x, y: p.y })),
      height,
      thickness,
    });
  }

  return { ribProfiles, ceilingProfilesArr };
}

// ── DXF export ──────────────────────────────────────────────────────
// PRODUCTION-PROVEN DXF R12 format — DO NOT MODIFY

export function exportDXF(ribProfiles: RibProfile[], params: RibParams): string {
  const height = params.height;
  const maxDepth = params.maxDepth;
  const dxfSpacing = maxDepth * 1.2;

  let dxf = '';

  // DXF R12 format header
  dxf += '0\nSECTION\n2\nHEADER\n';
  dxf += '9\n$ACADVER\n1\nAC1009\n';
  dxf += '9\n$INSUNITS\n70\n1\n';
  dxf += '0\nENDSEC\n';

  // Tables section with layers
  dxf += '0\nSECTION\n2\nTABLES\n';
  dxf += '0\nTABLE\n2\nLAYER\n70\n2\n';
  dxf += '0\nLAYER\n2\nCURVES\n70\n0\n62\n5\n6\nCONTINUOUS\n';
  dxf += '0\nLAYER\n2\nLINES\n70\n0\n62\n7\n6\nCONTINUOUS\n';
  dxf += '0\nENDTAB\n';
  dxf += '0\nENDSEC\n';

  // Entities section
  dxf += '0\nSECTION\n2\nENTITIES\n';

  ribProfiles.forEach((rib, ribIndex) => {
    const offsetX = ribIndex * dxfSpacing;
    const profile = rib.profile;
    const firstPoint = profile[0];
    const lastPoint = profile[profile.length - 1];

    // Bottom edge line
    dxf += '0\nLINE\n8\nLINES\n';
    dxf += `10\n${offsetX.toFixed(6)}\n20\n0.0\n30\n0.0\n`;
    dxf += `11\n${(offsetX + firstPoint.x).toFixed(6)}\n21\n${firstPoint.y.toFixed(6)}\n31\n0.0\n`;

    // Curved edge as spline polyline
    dxf += '0\nPOLYLINE\n8\nCURVES\n66\n1\n70\n4\n';

    profile.forEach((point) => {
      dxf += '0\nVERTEX\n8\nCURVES\n';
      dxf += `10\n${(offsetX + point.x).toFixed(6)}\n20\n${point.y.toFixed(6)}\n30\n0.0\n70\n8\n`;
    });

    dxf += '0\nSEQEND\n8\nCURVES\n';

    // Top edge line
    dxf += '0\nLINE\n8\nLINES\n';
    dxf += `10\n${(offsetX + lastPoint.x).toFixed(6)}\n20\n${lastPoint.y.toFixed(6)}\n30\n0.0\n`;
    dxf += `11\n${offsetX.toFixed(6)}\n21\n${height.toFixed(6)}\n31\n0.0\n`;

    // Left edge line (straight, at wall)
    dxf += '0\nLINE\n8\nLINES\n';
    dxf += `10\n${offsetX.toFixed(6)}\n20\n${height.toFixed(6)}\n30\n0.0\n`;
    dxf += `11\n${offsetX.toFixed(6)}\n21\n0.0\n31\n0.0\n`;
  });

  dxf += '0\nENDSEC\n0\nEOF\n';

  return dxf;
}

// ── CSV export ──────────────────────────────────────────────────────

export function exportCSV(
  params: RibParams,
  installationMode: InstallationMode,
  ledEnabled: boolean
): string {
  let csv = 'Rib Index,Height (in),Min Depth (in),Max Depth (in),Thickness (in),Phase Shift (rad)\n';

  for (let i = 0; i < params.count; i++) {
    const phaseShift = i * params.phase * Math.PI * 2;
    csv += `${i},${params.height},${params.minDepth},${params.maxDepth},${params.thickness},${phaseShift.toFixed(4)}\n`;
  }

  csv += `\nArray Settings\n`;
  csv += `Total Ribs,${params.count}\n`;
  csv += `Spacing,${params.spacing}"\n`;
  csv += `Total Width,${((params.count - 1) * params.spacing).toFixed(2)}"\n`;
  csv += `Wave Frequency,${params.frequency}\n`;
  csv += `Wave Type,${WAVE_TYPES[params.waveType]}\n`;
  csv += `Control Points,${params.controlPoints}\n`;
  csv += `Display Resolution,${params.displayResolution}\n`;

  const ribLength = installationMode === 'both' ? params.height + params.ceilingRun : params.height;
  const surfaceAreaPerRibSqFt = (ribLength * params.maxDepth) / 144;
  const totalSurfaceAreaSqFt = surfaceAreaPerRibSqFt * params.count;
  const ribPrice = totalSurfaceAreaSqFt * PRICE_PER_SF;

  csv += `\nPricing\n`;
  csv += `Surface Area per Rib,${surfaceAreaPerRibSqFt.toFixed(2)} sf\n`;
  csv += `Total Surface Area,${totalSurfaceAreaSqFt.toFixed(2)} sf\n`;
  csv += `Rib Price per SF,$${PRICE_PER_SF}\n`;
  csv += `Rib Total,$${ribPrice.toFixed(2)}\n`;

  // LED pricing
  const ledLinearFeet = (ribLength / 12) * params.count;
  const ledPrice = ledLinearFeet * PRICE_LED_PER_LF;

  csv += `\nLED Lighting,${ledEnabled ? 'Yes' : 'No'}\n`;
  if (ledEnabled) {
    csv += `LED Linear Feet,${ledLinearFeet.toFixed(2)} lf\n`;
    csv += `LED Price per LF,$${PRICE_LED_PER_LF}\n`;
    csv += `LED Total,$${ledPrice.toFixed(2)}\n`;
  }

  const totalPrice = ribPrice + (ledEnabled ? ledPrice : 0);
  csv += `\nGrand Total,$${totalPrice.toFixed(2)}\n`;

  return csv;
}

// ── Pricing calculations ────────────────────────────────────────────

export function calculatePricing(
  params: RibParams,
  installationMode: InstallationMode,
  ledEnabled: boolean
) {
  const totalWidth = (params.count - 1) * params.spacing;
  const ribLength = installationMode === 'both' ? params.height + params.ceilingRun : params.height;
  const surfaceAreaPerRibSqIn = ribLength * params.maxDepth;
  const surfaceAreaPerRibSqFt = surfaceAreaPerRibSqIn / 144;
  const totalSurfaceAreaSqFt = surfaceAreaPerRibSqFt * params.count;
  const ribPrice = totalSurfaceAreaSqFt * PRICE_PER_SF;

  const ledLinearFeet = (ribLength / 12) * params.count;
  const ledPrice = ledLinearFeet * PRICE_LED_PER_LF;
  const totalPrice = ribPrice + (ledEnabled ? ledPrice : 0);

  // Sheet calculation (48" × 144" sheets, splice for longer ribs)
  const ribsPerSheet = Math.floor(SHEET_WIDTH / params.maxDepth);
  const sectionsPerRib = Math.ceil(ribLength / SHEET_HEIGHT);
  const totalSlots = params.count * sectionsPerRib;
  const sheetsNeeded = Math.ceil(totalSlots / Math.max(ribsPerSheet, 1));
  const sheetTotalCost = sheetsNeeded * SHEET_PRICE;

  let wallCoverage: string;
  if (installationMode === 'both') {
    wallCoverage =
      (totalWidth / 12).toFixed(1) + "' wide x " + (params.height / 12).toFixed(1) + "' wall + " + (params.ceilingRun / 12).toFixed(1) + "' ceiling";
  } else {
    wallCoverage =
      (totalWidth / 12).toFixed(1) + "' wide x " + (params.height / 12).toFixed(1) + "' tall";
  }

  return {
    totalWidth,
    ribLength,
    totalSurfaceAreaSqFt,
    ribPrice,
    ledLinearFeet,
    ledPrice,
    totalPrice,
    ribsPerSheet,
    sectionsPerRib,
    sheetsNeeded,
    sheetTotalCost,
    wallCoverage,
  };
}

// ── File download utility ───────────────────────────────────────────

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ── Lighting presets ────────────────────────────────────────────────

export const LIGHTING_PRESETS = {
  standard: {
    background: 0x1a1a1f,
    hemisphere: { sky: 0xc8d0e0, ground: 0x3a3530, intensity: 0.6 },
    lights: [
      { type: 'directional' as const, color: 0xffffff, intensity: 3.0, position: [8, 18, 5] as [number, number, number], castShadow: true },
      { type: 'directional' as const, color: 0xeeeeff, intensity: 1.2, position: [15, 5, 15] as [number, number, number] },
      { type: 'directional' as const, color: 0xeeeeff, intensity: 1.2, position: [15, 5, -15] as [number, number, number] },
      { type: 'directional' as const, color: 0xdddde8, intensity: 0.6, position: [-5, 12, 0] as [number, number, number] },
    ],
  },
  dramatic: {
    background: 0x050505,
    hemisphere: { sky: 0x1a1210, ground: 0x050505, intensity: 0.15 },
    lights: [
      { type: 'directional' as const, color: 0xffcc88, intensity: 4.0, position: [15, 20, 5] as [number, number, number], castShadow: true },
      { type: 'directional' as const, color: 0xff9955, intensity: 1.5, position: [12, 5, 12] as [number, number, number] },
      { type: 'directional' as const, color: 0xff9955, intensity: 1.5, position: [12, 5, -12] as [number, number, number] },
      { type: 'directional' as const, color: 0xffaa66, intensity: 0.6, position: [-3, 15, 0] as [number, number, number] },
    ],
  },
  sunset: {
    background: 0x1a1015,
    hemisphere: { sky: 0x664433, ground: 0x110808, intensity: 0.3 },
    lights: [
      { type: 'directional' as const, color: 0xff8844, intensity: 3.5, position: [20, 12, 5] as [number, number, number], castShadow: true },
      { type: 'directional' as const, color: 0xff4422, intensity: 1.2, position: [15, 3, 12] as [number, number, number] },
      { type: 'directional' as const, color: 0xff4422, intensity: 1.2, position: [15, 3, -12] as [number, number, number] },
      { type: 'directional' as const, color: 0x6644aa, intensity: 0.8, position: [-10, 15, 0] as [number, number, number] },
    ],
  },
  cool: {
    background: 0x0a0e14,
    hemisphere: { sky: 0x667799, ground: 0x0a0e14, intensity: 0.3 },
    lights: [
      { type: 'directional' as const, color: 0xddeeff, intensity: 3.5, position: [12, 22, 5] as [number, number, number], castShadow: true },
      { type: 'directional' as const, color: 0x4466aa, intensity: 1.0, position: [10, 5, 12] as [number, number, number] },
      { type: 'directional' as const, color: 0x4466aa, intensity: 1.0, position: [10, 5, -12] as [number, number, number] },
      { type: 'directional' as const, color: 0x88aadd, intensity: 0.5, position: [-5, 15, 0] as [number, number, number] },
    ],
  },
  night: {
    background: 0x030304,
    hemisphere: { sky: 0x0a0a15, ground: 0x030304, intensity: 0.08 },
    lights: [
      { type: 'directional' as const, color: 0xffaa66, intensity: 3.0, position: [10, 18, 5] as [number, number, number], castShadow: true },
      { type: 'directional' as const, color: 0x5566aa, intensity: 0.8, position: [8, 4, 10] as [number, number, number] },
      { type: 'directional' as const, color: 0x5566aa, intensity: 0.8, position: [8, 4, -10] as [number, number, number] },
      { type: 'directional' as const, color: 0x332244, intensity: 0.3, position: [-5, 12, 0] as [number, number, number] },
    ],
  },
};

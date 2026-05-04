export interface RibParams {
  height: number;
  minDepth: number;
  maxDepth: number;
  thickness: number;
  count: number;
  spacing: number;
  frequency: number;
  phase: number;
  waveType: number;
  controlPoints: number;
  displayResolution: number;
  color: string;
  ceilingRun: number;
}

export interface RibProfile {
  index: number;
  profile: { x: number; y: number }[];
  controlPoints: { x: number; y: number }[];
  height: number;
  thickness: number;
  ceilingProfile?: { x: number; y: number }[];
  ceilingRun?: number;
}

export type InstallationMode = 'wall' | 'ceiling' | 'both';

export type LightingPreset = 'standard' | 'dramatic' | 'sunset' | 'cool' | 'night';

export const WAVE_TYPES = ['Sine', 'Smooth', 'Sharp'] as const;

export const SCALE = 0.1; // 1 inch = 0.1 units in 3D
// $38/sf gives a clean 2× margin over our ~$19/sf landed cost:
//   • Corian sheet ($500) + CNC milling ($300) = $800/sheet ÷ 48 sf = $16.67/sf material
//   • Aluminum U-channel + brackets at $17/rib × ~5 ribs/sheet ÷ 48 sf ≈ $1.77/sf
//   ≈ $19/sf landed cost · $38/sf retail · 2× margin
export const PRICE_PER_SF = 38;
export const PRICE_LED_PER_LF = 30;
export const SHEET_WIDTH = 48;   // inches
export const SHEET_HEIGHT = 144; // inches
export const SHEET_PRICE = 1800; // $ per sheet

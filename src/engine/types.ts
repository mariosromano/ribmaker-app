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
// Retail markup
//   retail = totalCost × MARGIN_MULTIPLIER  (2× = 50% gross margin)
//   The customer sees a derived $/sf, not this multiplier directly.
export const MARGIN_MULTIPLIER = 2.0;
// Legacy — sf × this rate was the old retail formula. Kept for any
// external reference, no longer used in calculation.
export const PRICE_PER_SF = 38;
export const PRICE_LED_PER_LF = 30;

// Material — Corian sheet
export const SHEET_WIDTH = 48;        // inches
export const SHEET_HEIGHT = 144;      // inches (= 48 sf per sheet)
export const SHEET_PRICE = 1800;      // $ per sheet (retail anchor — not used in margin calc)

// COST inputs — used for margin / profit display
export const COST_SHEET_BLANK = 500;  // $ per Corian sheet (material)
export const COST_SHEET_CNC = 300;    // $ per sheet for CNC milling
export const COST_HARDWARE_PER_RIB = 17; // U-channel + L-brackets + bolts per rib

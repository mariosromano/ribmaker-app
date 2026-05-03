// Generate grayscale rib-friendly pattern PNGs.
//
// Each pattern is a function (x, y) → brightness in [0, 1] over a 1024×1024 grid.
// We pick pure-math patterns that have:
//  • smooth vertical gradients (clean rib edges)
//  • strong horizontal variation (different ribs look different)
//  • full 0..1 range (max depth dynamic range)
//
// Output: PNGs in public/patterns/ with names matching patterns.ts.

import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'patterns');
mkdirSync(OUT_DIR, { recursive: true });

const SIZE = 1024;
const PI = Math.PI;
const TAU = 2 * PI;

// Util: smoothstep + clamp
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => 0.5 - 0.5 * Math.cos(PI * clamp01(v));

// Each pattern: (u, v) where u,v ∈ [0,1] → brightness ∈ [0,1]
const patterns = {
  rings: (u, v) => {
    const dx = u - 0.5, dy = v - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2;
    return 0.5 + 0.5 * Math.sin(r * 18);
  },
  horizontal_waves: (u, v) => {
    return 0.5 + 0.5 * Math.sin(v * TAU * 5 + Math.sin(u * TAU * 2) * 0.6);
  },
  diagonal_waves: (u, v) => {
    const t = (u + v) * 0.5;
    return 0.5 + 0.5 * Math.sin(t * TAU * 6 + Math.cos(u * TAU) * 0.8);
  },
  vertical_gradient: (u, v) => {
    const ripple = 0.15 * Math.sin(u * TAU * 4) * Math.sin(v * TAU);
    return clamp01(v + ripple);
  },
  radial_dome: (u, v) => {
    const dx = u - 0.5, dy = v - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2;
    return clamp01(1 - r * r);
  },
  topo_contours: (u, v) => {
    // Sum of two sines + slow noise → smooth multi-peak landscape
    const a = Math.sin(u * TAU * 2.3 + 1.2) * 0.5;
    const b = Math.sin(v * TAU * 2.7 + 0.4) * 0.5;
    const c = Math.sin((u + v) * TAU * 1.5) * 0.3;
    return smooth(0.5 + (a + b + c) * 0.5);
  },
  mountain_horizon: (u, v) => {
    // Mountain silhouette: bright sky, dark below ridge line
    const ridge = 0.55
      + 0.18 * Math.sin(u * TAU * 1.5 + 0.7)
      + 0.10 * Math.sin(u * TAU * 3.7 + 1.8)
      + 0.05 * Math.sin(u * TAU * 7.3 + 0.2);
    if (v > ridge) return clamp01(1 - (v - ridge) / (1 - ridge) * 1.2);
    return clamp01(v / ridge * 0.4);
  },
  spiral: (u, v) => {
    const dx = u - 0.5, dy = v - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2;
    const a = Math.atan2(dy, dx);
    return 0.5 + 0.5 * Math.sin(r * 10 + a * 5);
  },
  flow_field: (u, v) => {
    // Curving lines that flow across the wall
    const t = Math.sin(u * TAU * 1.3) * 0.3 + v;
    return 0.5 + 0.5 * Math.sin(t * TAU * 6);
  },
  zigzag_organic: (u, v) => {
    // Organic zig-zag waves stacked vertically
    const offset = Math.sin(v * TAU * 3) * 0.08;
    return 0.5 + 0.5 * Math.sin((u + offset) * TAU * 8);
  },
  ridges: (u, v) => {
    // Sharp parallel ridges with smooth falloff (vertical)
    const w = Math.abs(Math.sin(u * TAU * 6));
    return Math.pow(w, 0.7);
  },
  ocean_waves: (u, v) => {
    // Multiple frequencies → complex wave-like surface
    const a = Math.sin(u * TAU * 2 + v * TAU * 1.5) * 0.5;
    const b = Math.sin(u * TAU * 5 - v * TAU * 0.8) * 0.25;
    return smooth(0.5 + a + b);
  },
};

function renderPattern(name, fn) {
  const png = new PNG({ width: SIZE, height: SIZE, colorType: 0, inputColorType: 0, bitDepth: 8 });
  // colorType 0 = grayscale, 1 byte per pixel — but pngjs expects RGBA buffer; encode as RGB anyway
  const rgba = new PNG({ width: SIZE, height: SIZE });
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = x / (SIZE - 1);
      const v = y / (SIZE - 1);
      const b = Math.round(clamp01(fn(u, v)) * 255);
      const idx = (SIZE * y + x) << 2;
      rgba.data[idx] = b;
      rgba.data[idx + 1] = b;
      rgba.data[idx + 2] = b;
      rgba.data[idx + 3] = 255;
    }
  }
  void png; // unused
  const buffer = PNG.sync.write(rgba);
  const outPath = join(OUT_DIR, `${name}.png`);
  writeFileSync(outPath, buffer);
  console.log(`✓ ${name}.png`);
}

console.log(`Generating ${Object.keys(patterns).length} patterns at ${SIZE}×${SIZE} → ${OUT_DIR}`);
for (const [name, fn] of Object.entries(patterns)) {
  renderPattern(name, fn);
}
console.log('Done.');

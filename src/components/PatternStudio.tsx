import { useEffect, useRef, useState, useCallback } from 'react';
import { loadImageDataFromCanvas } from '../engine/ribEngine';

type PatternType = 'sine' | 'rings' | 'spiral' | 'topo' | 'flow';

const PATTERN_TYPES: { id: PatternType; label: string }[] = [
  { id: 'sine',   label: 'Sine' },
  { id: 'rings',  label: 'Rings' },
  { id: 'spiral', label: 'Spiral' },
  { id: 'topo',   label: 'Topo' },
  { id: 'flow',   label: 'Flow' },
];

// Each pattern: (u, v) ∈ [0,1] → brightness ∈ [0,1]
// Uses the four parameters: frequency, amplitude, phase, rotationDeg
function brightnessAt(
  type: PatternType,
  u: number, v: number,
  frequency: number, amplitude: number, phase: number, rotationDeg: number,
): number {
  // Rotate (u,v) about center
  const cx = 0.5, cy = 0.5;
  const a = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  const ru = (u - cx) * cos - (v - cy) * sin + cx;
  const rv = (u - cx) * sin + (v - cy) * cos + cy;
  const TAU = Math.PI * 2;
  const ph = phase * TAU;
  let val = 0.5;

  if (type === 'sine') {
    val = 0.5 + 0.5 * Math.sin(rv * TAU * frequency + ph) * amplitude;
  } else if (type === 'rings') {
    const dx = ru - 0.5, dy = rv - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2;
    val = 0.5 + 0.5 * Math.sin(r * frequency * 4 + ph) * amplitude;
  } else if (type === 'spiral') {
    const dx = ru - 0.5, dy = rv - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2;
    const ang = Math.atan2(dy, dx);
    val = 0.5 + 0.5 * Math.sin(r * frequency * 2 + ang * 4 + ph) * amplitude;
  } else if (type === 'topo') {
    const a1 = Math.sin(ru * TAU * frequency * 0.6 + ph) * 0.5;
    const a2 = Math.sin(rv * TAU * frequency * 0.7 + ph * 1.3) * 0.5;
    const a3 = Math.sin((ru + rv) * TAU * frequency * 0.4 + ph * 0.7) * 0.3;
    val = 0.5 + (a1 + a2 + a3) * 0.5 * amplitude;
  } else if (type === 'flow') {
    const offset = Math.sin(ru * TAU * 1.2 + ph) * 0.3;
    val = 0.5 + 0.5 * Math.sin((rv + offset) * TAU * frequency + ph) * amplitude;
  }
  return Math.max(0, Math.min(1, val));
}

const PREVIEW_SIZE = 200;
const APPLY_SIZE = 1024;

interface Props {
  onApply: () => void;
}

export default function PatternStudio({ onApply }: Props) {
  const [type, setType] = useState<PatternType>('sine');
  const [frequency, setFrequency] = useState(5);
  const [amplitude, setAmplitude] = useState(1);
  const [phase, setPhase] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [showCode, setShowCode] = useState(false);

  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  // Render preview whenever any param changes
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(PREVIEW_SIZE, PREVIEW_SIZE);
    for (let y = 0; y < PREVIEW_SIZE; y++) {
      for (let x = 0; x < PREVIEW_SIZE; x++) {
        const u = x / (PREVIEW_SIZE - 1);
        const v = y / (PREVIEW_SIZE - 1);
        const b = Math.round(brightnessAt(type, u, v, frequency, amplitude, phase, rotation) * 255);
        const idx = (y * PREVIEW_SIZE + x) * 4;
        img.data[idx] = b;
        img.data[idx + 1] = b;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [type, frequency, amplitude, phase, rotation]);

  const surpriseMe = useCallback(() => {
    const types = PATTERN_TYPES.map(p => p.id);
    setType(types[Math.floor(Math.random() * types.length)]);
    setFrequency(2 + Math.random() * 10);
    setAmplitude(0.5 + Math.random() * 0.5);
    setPhase(Math.random());
    setRotation(Math.floor(Math.random() * 360));
  }, []);

  const applyToWall = useCallback(() => {
    // Render at full resolution into an offscreen canvas, then push to the rib sampler
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas');
      offscreenRef.current.width = APPLY_SIZE;
      offscreenRef.current.height = APPLY_SIZE;
    }
    const canvas = offscreenRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(APPLY_SIZE, APPLY_SIZE);
    for (let y = 0; y < APPLY_SIZE; y++) {
      for (let x = 0; x < APPLY_SIZE; x++) {
        const u = x / (APPLY_SIZE - 1);
        const v = y / (APPLY_SIZE - 1);
        const b = Math.round(brightnessAt(type, u, v, frequency, amplitude, phase, rotation) * 255);
        const idx = (y * APPLY_SIZE + x) * 4;
        img.data[idx] = b;
        img.data[idx + 1] = b;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    loadImageDataFromCanvas(canvas);
    onApply();
  }, [type, frequency, amplitude, phase, rotation, onApply]);

  const codeSnippet = (() => {
    const f = frequency.toFixed(2);
    const a = amplitude.toFixed(2);
    const p = (phase * 2 * Math.PI).toFixed(2);
    if (type === 'sine') return `0.5 + 0.5 * sin(v * 2π * ${f} + ${p}) * ${a}`;
    if (type === 'rings') return `0.5 + 0.5 * sin(r * ${f} * 4 + ${p}) * ${a}`;
    if (type === 'spiral') return `0.5 + 0.5 * sin(r * ${f} * 2 + θ * 4 + ${p}) * ${a}`;
    if (type === 'topo') return `0.5 + (sin(u·${f}·0.6) + sin(v·${f}·0.7) + …) * 0.5 * ${a}`;
    return `0.5 + 0.5 * sin((v + sin(u·1.2)·0.3) * 2π * ${f} + ${p}) * ${a}`;
  })();

  return (
    <div>
      <canvas
        ref={previewRef}
        width={PREVIEW_SIZE}
        height={PREVIEW_SIZE}
        className="w-full max-w-[200px] mx-auto block rounded border border-[#3a3a42] bg-black mb-3"
      />

      <div className="grid grid-cols-5 gap-1 mb-3">
        {PATTERN_TYPES.map(p => (
          <button
            key={p.id}
            onClick={() => setType(p.id)}
            className={`py-1.5 text-[10px] rounded border transition-all ${
              type === p.id
                ? 'border-[#7c9bff] bg-[rgba(124,155,255,0.15)] text-white'
                : 'border-[#3a3a42] bg-[#2a2a30] text-[#888] hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 mb-3">
        <DialSlider label="Frequency" value={frequency} min={1} max={15} step={0.1} onChange={setFrequency} format={v => v.toFixed(1)} />
        <DialSlider label="Amplitude" value={amplitude} min={0.2} max={1} step={0.05} onChange={setAmplitude} format={v => v.toFixed(2)} />
        <DialSlider label="Phase" value={phase} min={0} max={1} step={0.01} onChange={setPhase} format={v => v.toFixed(2)} />
        <DialSlider label="Rotation" value={rotation} min={0} max={360} step={1} onChange={setRotation} format={v => `${v}°`} />
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <button
          onClick={surpriseMe}
          className="py-2 rounded-md bg-[#4a4a52] hover:bg-[#5a5a62] text-white text-[11px] font-medium transition-colors"
        >
          🎲 Surprise Me
        </button>
        <button
          onClick={applyToWall}
          className="py-2 rounded-md bg-[#7c9bff] hover:bg-[#6b8aee] text-white text-[11px] font-semibold transition-colors"
        >
          Apply to Wall
        </button>
      </div>

      <button
        onClick={() => setShowCode(!showCode)}
        className="w-full text-left text-[10px] text-[#666] hover:text-[#aaa] mb-1"
      >
        {showCode ? '▼' : '▶'} Show math
      </button>
      {showCode && (
        <div className="bg-[#1a1a1f] rounded p-2 text-[10px] text-[#7c9bff] font-mono break-all leading-relaxed">
          brightness(u, v) =<br />
          &nbsp;&nbsp;{codeSnippet}
        </div>
      )}
    </div>
  );
}

function DialSlider({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-[#ccc] mb-0.5">
        <span>{label}</span>
        <span className="text-[#7c9bff] font-mono">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

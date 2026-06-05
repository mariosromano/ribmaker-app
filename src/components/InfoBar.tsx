import { useMemo } from 'react';
import type { RibParams, InstallationMode } from '../engine/types';
import { calculatePricing } from '../engine/ribEngine';

interface InfoBarProps {
  params: RibParams;
  installationMode: InstallationMode;
  ledEnabled: boolean;
}

/** A clean label → value row used across the summary cards. */
function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] text-[var(--ink-muted)] shrink-0">{label}</span>
      <span className={`text-[12.5px] font-medium text-right ${muted ? 'text-[var(--ink-soft)]' : 'text-[var(--ink)]'}`}>
        {value}
      </span>
    </div>
  );
}

export default function InfoBar({ params, installationMode, ledEnabled }: InfoBarProps) {
  const pricing = useMemo(
    () => calculatePricing(params, installationMode, ledEnabled),
    [params, installationMode, ledEnabled]
  );

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const pricePerRib = params.count > 0 ? pricing.totalPrice / params.count : 0;

  return (
    <div className="space-y-2.5">
      {/* ── Project Summary ─────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-[var(--line)]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
            Project Summary
          </span>
        </div>
        <div className="px-4 py-3 space-y-2">
          <Row label="Fins" value={`${params.count}`} />
          <Row label="Depth" value={`${params.minDepth}"–${params.maxDepth}"`} />
          <Row label="Array width" value={`${(pricing.totalWidth / 12).toFixed(1)}′  (${pricing.totalWidth.toFixed(0)}")`} />
          <Row label="Wall coverage" value={pricing.wallCoverage} />
          <Row label="Surface area" value={`${pricing.totalSurfaceAreaSqFt.toFixed(1)} sf`} />
        </div>
      </div>

      {/* ── Material Estimate ───────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-[var(--line)] flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
            Material Estimate
          </span>
          <span className="text-[9px] text-[var(--ink-faint)]">48″ × 144″ Corian</span>
        </div>
        <div className="px-4 py-3 space-y-2">
          <Row label="Fins per sheet" value={`${pricing.ribsPerSheet}`} />
          <Row
            label="Sheets needed"
            value={`${pricing.sheetsNeeded}${pricing.sectionsPerRib > 1 ? ` · ${pricing.sectionsPerRib} sections/fin` : ''}`}
          />
          {pricing.composedRibsCount > 0 && (
            <Row
              label="Build"
              value={`${pricing.singlePieceRibs} single + ${pricing.composedRibsCount} composed`}
            />
          )}
        </div>
      </div>

      {/* ── Investment ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--gold-deep)]/30 bg-gradient-to-b from-[var(--surface-3)] to-[var(--surface-2)] overflow-hidden">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--gold-bright)]">
            Project Investment
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--gold)] text-[#1a1a14]">
            Intro · 180 days
          </span>
        </div>
        <div className="px-4 pb-3">
          <div className="text-[34px] font-semibold tracking-tight text-[var(--ink)] leading-none mb-2.5 font-mono">
            {fmt(pricing.totalPrice)}
          </div>
          <div className="space-y-1.5 pt-2.5 border-t border-[var(--line)]">
            <Row label="Per fin" value={fmt(pricePerRib)} muted />
            <Row label="Wall face" value={`${pricing.wallSurfaceAreaSqFt.toFixed(1)} sf`} muted />
            <Row label="$ / sf wall face" value={`$${pricing.pricePerWallSf.toFixed(2)}`} muted />
          </div>
          {pricing.minOrderApplied && (
            <div className="mt-2.5 px-3 py-2 rounded-lg bg-[var(--surface-4)] border border-[var(--line)] text-[var(--gold-bright)] text-[11px] leading-relaxed">
              Project minimum applied — small projects are priced at the $3,500 floor.
            </div>
          )}
        </div>
      </div>

      {/* Cost & Margin block hidden from user — values still flow to Airtable via /api/quote */}
    </div>
  );
}

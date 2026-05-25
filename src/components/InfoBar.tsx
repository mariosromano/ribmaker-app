import { useMemo } from 'react';
import type { RibParams, InstallationMode } from '../engine/types';
import { calculatePricing } from '../engine/ribEngine';

interface InfoBarProps {
  params: RibParams;
  installationMode: InstallationMode;
  ledEnabled: boolean;
}

export default function InfoBar({ params, installationMode, ledEnabled }: InfoBarProps) {
  const pricing = useMemo(
    () => calculatePricing(params, installationMode, ledEnabled),
    [params, installationMode, ledEnabled]
  );

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const pricePerSheet = pricing.sheetsNeeded > 0 ? pricing.totalPrice / pricing.sheetsNeeded : 0;
  const pricePerRib = params.count > 0 ? pricing.totalPrice / params.count : 0;

  return (
    <div className="space-y-1.5">
      {/* Internal verification — not for public release */}
      <div className="text-[9px] text-[#666] uppercase tracking-wider px-1">Internal · for verification</div>

      {/* Dimensions */}
      <div className="font-mono text-[13px] text-[#bbb] p-3 bg-[#1a1a1f] rounded leading-[1.8]">
        <strong className="text-white">Number of Fins:</strong> {params.count}<br />
        <strong className="text-white">Min Depth:</strong> {params.minDepth}"{' '}
        | <strong className="text-white">Max Depth:</strong> {params.maxDepth}"<br />
        <strong className="text-white">Total Array Width:</strong>{' '}
        {pricing.totalWidth.toFixed(1)}" ({(pricing.totalWidth / 12).toFixed(1)}')
        <br />
        <strong className="text-white">Wall Coverage:</strong> {pricing.wallCoverage}<br />
        <strong className="text-white">Surface Area:</strong> {pricing.totalSurfaceAreaSqFt.toFixed(1)} sf
      </div>

      {/* Material Sheets */}
      <div className="font-mono text-[13px] text-[#bbb] p-3 bg-[#1a1a1f] rounded leading-[1.8]">
        <strong className="text-white">Material Sheets</strong>{' '}
        <span className="text-[11px] text-[#888]">(48" × 144" Corian)</span>
        <br />
        <strong>Fins/sheet:</strong> {pricing.ribsPerSheet} |{' '}
        <strong>Sheets needed:</strong>{' '}
        {pricing.sheetsNeeded}
        {pricing.sectionsPerRib > 1 && ` (spliced, ${pricing.sectionsPerRib} sections/fin)`}
        <br />
        <strong>Sheet price:</strong> {fmt(pricePerSheet)}/sheet{' '}
        <span className="text-[11px] text-[#888]">(total ÷ {pricing.sheetsNeeded})</span>
      </div>

      {/* Pricing — retail */}
      <div className="bg-[#2d4a2d] rounded-md p-3.5 font-mono text-[14px] leading-[1.8]">
        <div className="flex items-center justify-between mb-1">
          <strong className="text-white text-[15px]">Project Investment</strong>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#d4af37] text-[#1a1a1f]">
            Intro · 180 days
          </span>
        </div>
        <strong className="text-white">Material:</strong>{' '}
        {pricing.totalSurfaceAreaSqFt.toFixed(1)} sf · {params.count} fins · {pricing.sheetsNeeded} sheets
        <br />
        <strong className="text-white">Wall face:</strong>{' '}
        {pricing.wallSurfaceAreaSqFt.toFixed(1)} sf{' '}
        <span className="text-[11px] text-[#bfeebf]">(width × height)</span>
        <br />
        {pricing.composedRibsCount > 0 && (
          <>
            <strong className="text-white">Build:</strong>{' '}
            {pricing.singlePieceRibs} single + {pricing.composedRibsCount} composed{' '}
            <span className="text-[11px] text-[#bfeebf]">(concealed splice)</span>
            <br />
          </>
        )}
        {pricing.minOrderApplied && (
          <div className="my-1 px-2 py-1 rounded bg-[#3a2d2d] text-[#ffb38a] text-[11px]">
            ⓘ Project minimum applied — small projects priced at $3,500 floor.
          </div>
        )}
        <strong className="text-white">Per fin:</strong> {fmt(pricePerRib)}
        <br />
        <strong className="text-white">$/sf material:</strong>{' '}
        <span className="text-[#8eff8e]">${pricing.pricePerSf.toFixed(2)}/sf</span>
        <br />
        <strong className="text-white">$/sf wall face:</strong>{' '}
        <span className="text-[#8eff8e]">${pricing.pricePerWallSf.toFixed(2)}/sf</span>
        <br />
        <span className="text-[28px] font-bold text-[#8eff8e]">{fmt(pricing.totalPrice)}</span>
      </div>

      {/* Cost & Margin block hidden from user — values still flow to Airtable via /api/quote */}
    </div>
  );
}

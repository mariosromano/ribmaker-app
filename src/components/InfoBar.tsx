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

  return (
    <div className="space-y-1.5">
      {/* Dimensions */}
      <div className="font-mono text-[11px] text-[#888] p-2.5 bg-[#1a1a1f] rounded leading-[1.8]">
        <strong className="text-[#aaa]">Number of Ribs:</strong> {params.count}<br />
        <strong className="text-[#aaa]">Total Array Width:</strong>{' '}
        {pricing.totalWidth.toFixed(1)}" ({(pricing.totalWidth / 12).toFixed(1)}')
        <br />
        <strong className="text-[#aaa]">Wall Coverage:</strong> {pricing.wallCoverage}<br />
        <strong className="text-[#aaa]">Surface Area:</strong> {pricing.totalSurfaceAreaSqFt.toFixed(1)} sf
      </div>

      {/* Material Sheets */}
      <div className="font-mono text-[11px] text-[#888] p-2 bg-[#1a1a1f] rounded leading-[1.8]">
        <strong className="text-[#aaa]">Material Sheets</strong>{' '}
        <small>(48" × 144" Corian)</small>
        <br />
        <strong>Ribs/sheet:</strong> {pricing.ribsPerSheet} |{' '}
        <strong>Sheets needed:</strong>{' '}
        {pricing.sheetsNeeded}
        {pricing.sectionsPerRib > 1 && ` (spliced, ${pricing.sectionsPerRib} sections/rib)`}
        <br />
        <strong>Sheet cost:</strong> {pricing.sheetsNeeded} × $1,800 = {fmt(pricing.sheetTotalCost)}
      </div>

      {/* Pricing */}
      <div className="bg-[#2d4a2d] rounded-md p-3 font-mono text-[11px] leading-[1.8]">
        <strong className="text-[#aaa]">Estimated Price</strong>
        <br />
        <strong className="text-[#aaa]">Ribs:</strong>{' '}
        {pricing.totalSurfaceAreaSqFt.toFixed(1)} sf @ $45/sf{' '}
        <small>(incl. hardware)</small> = {fmt(pricing.ribPrice)}
        <br />
        {ledEnabled && (
          <>
            <strong className="text-[#aaa]">LED:</strong>{' '}
            {pricing.ledLinearFeet.toFixed(1)} lf @ $30/lf = {fmt(pricing.ledPrice)}
            <br />
          </>
        )}
        <span className="text-lg font-bold text-[#8eff8e]">{fmt(pricing.totalPrice)}</span>
      </div>
    </div>
  );
}

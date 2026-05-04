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
        <strong className="text-white">Number of Ribs:</strong> {params.count}<br />
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
        <strong>Ribs/sheet:</strong> {pricing.ribsPerSheet} |{' '}
        <strong>Sheets needed:</strong>{' '}
        {pricing.sheetsNeeded}
        {pricing.sectionsPerRib > 1 && ` (spliced, ${pricing.sectionsPerRib} sections/rib)`}
        <br />
        <strong>Sheet price:</strong> {fmt(pricePerSheet)}/sheet{' '}
        <span className="text-[11px] text-[#888]">(total ÷ {pricing.sheetsNeeded})</span>
      </div>

      {/* Pricing — retail */}
      <div className="bg-[#2d4a2d] rounded-md p-3.5 font-mono text-[14px] leading-[1.8]">
        <strong className="text-white text-[15px]">Estimated Price (Retail)</strong>
        <br />
        <strong className="text-white">Ribs:</strong>{' '}
        {pricing.totalSurfaceAreaSqFt.toFixed(1)} sf @ $38/sf{' '}
        <span className="text-[12px] text-[#bfeebf]">(incl. hardware)</span> = {fmt(pricing.ribPrice)}
        <br />
        {ledEnabled && (
          <>
            <strong className="text-white">LED:</strong>{' '}
            {pricing.ledLinearFeet.toFixed(1)} lf @ $30/lf = {fmt(pricing.ledPrice)}
            <br />
          </>
        )}
        <strong className="text-white">Per rib:</strong> {fmt(pricePerRib)}{' '}
        <span className="text-[12px] text-[#bfeebf]">(total ÷ {params.count})</span>
        <br />
        <span className="text-[28px] font-bold text-[#8eff8e]">{fmt(pricing.totalPrice)}</span>
      </div>

      {/* Cost & Margin — internal */}
      <div className="bg-[#3a2d4a] rounded-md p-3.5 font-mono text-[14px] leading-[1.8]">
        <strong className="text-white text-[15px]">Cost &amp; Margin</strong>
        <br />
        <strong className="text-white">Material:</strong> {pricing.sheetsNeeded} sheets × $500 = {fmt(pricing.costMaterial)}
        <br />
        <strong className="text-white">CNC:</strong> {pricing.sheetsNeeded} sheets × $300 = {fmt(pricing.costCNC)}
        <br />
        <strong className="text-white">Hardware:</strong> {params.count} ribs × $17 = {fmt(pricing.costHardware)}
        <br />
        <strong className="text-white">Total Cost:</strong>{' '}
        <span className="text-[16px] font-bold text-[#ffb38a]">{fmt(pricing.totalCost)}</span>
        <br />
        <strong className="text-white">Profit:</strong>{' '}
        <span className="text-[20px] font-bold text-[#c9a0ff]">{fmt(pricing.profit)}</span>
        <br />
        <strong className="text-white">Margin:</strong>{' '}
        <span className="text-[16px] font-bold text-[#c9a0ff]">{pricing.marginPct.toFixed(1)}%</span>{' '}
        <span className="text-[11px] text-[#aa8acc]">({pricing.markupPct.toFixed(0)}% markup)</span>
      </div>
    </div>
  );
}

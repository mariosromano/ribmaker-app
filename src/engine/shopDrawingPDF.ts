import type { RibParams, InstallationMode } from './types';
import { calculatePricing } from './ribEngine';

function fmtFt(inches: number): string {
  const ft = Math.floor(inches / 12);
  const rem = +(inches - ft * 12).toFixed(2);
  if (rem === 0) return `${ft}'-0"`;
  return `${ft}'-${rem}"`;
}

function fmtUSD(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// MRW-RIB-YYYYMMDD-XXXX — suffix is hash of params so the same design re-exports the same code
function generateDrawingCode(params: RibParams, installationMode: InstallationMode, ledEnabled: boolean): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const sig = `${params.count}x${params.spacing}x${params.height}x${params.minDepth}x${params.maxDepth}x${params.thickness}x${params.frequency}x${params.phase}x${params.waveType}x${installationMode}x${ledEnabled ? 1 : 0}`;
  let hash = 0;
  for (let i = 0; i < sig.length; i++) hash = ((hash << 5) - hash + sig.charCodeAt(i)) | 0;
  const suffix = Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
  return `MRW-RIB-${ymd}-${suffix}`;
}

// ── ELEVATION (front view): wall outline + vertical rib edges + dimensions
function drawElevationView(
  pdf: import('jspdf').jsPDF,
  params: RibParams,
  x: number, y: number, w: number, h: number,
) {
  const totalLen = (params.count - 1) * params.spacing;
  const wallH = params.height;

  // Title bar at top of box
  pdf.setFillColor(245, 245, 245);
  pdf.rect(x, y, w, 0.22, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(60);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ELEVATION  ·  FRONT VIEW', x + w / 2, y + 0.15, { align: 'center' });

  // Inner area for the drawing (title bar + clear room for top dim line + label)
  const padTop = 0.7;
  const padBottom = 0.65;
  const padLeft = 0.65;
  const padRight = 0.4;
  const innerX = x + padLeft;
  const innerY = y + padTop;
  const innerW = w - padLeft - padRight;
  const innerH = h - padTop - padBottom;

  const sx = innerW / totalLen;
  const sy = innerH / wallH;
  const s = Math.min(sx, sy);
  const drawW = totalLen * s;
  const drawH = wallH * s;
  const ox = innerX + (innerW - drawW) / 2;
  const oy = innerY + (innerH - drawH) / 2;

  // Wall outline
  pdf.setDrawColor(40);
  pdf.setLineWidth(0.015);
  pdf.rect(ox, oy, drawW, drawH);

  // Each rib as a vertical line at center spacing
  pdf.setDrawColor(80);
  pdf.setLineWidth(0.005);
  for (let i = 0; i < params.count; i++) {
    const cx = ox + i * params.spacing * s;
    pdf.line(cx, oy, cx, oy + drawH);
  }

  // Top dimension — total length
  const dimY = oy - 0.22;
  pdf.setDrawColor(120);
  pdf.setLineWidth(0.008);
  pdf.line(ox, dimY, ox + drawW, dimY);
  pdf.line(ox, dimY - 0.05, ox, dimY + 0.05);
  pdf.line(ox + drawW, dimY - 0.05, ox + drawW, dimY + 0.05);
  pdf.setFontSize(8);
  pdf.setTextColor(50);
  pdf.setFont('helvetica', 'bold');
  pdf.text(fmtFt(totalLen), ox + drawW / 2, dimY - 0.06, { align: 'center' });

  // Left dimension — wall height
  const ddX = ox - 0.28;
  pdf.line(ddX, oy, ddX, oy + drawH);
  pdf.line(ddX - 0.05, oy, ddX + 0.05, oy);
  pdf.line(ddX - 0.05, oy + drawH, ddX + 0.05, oy + drawH);
  pdf.setFontSize(8);
  pdf.setTextColor(50);
  pdf.setFont('helvetica', 'bold');
  pdf.text(fmtFt(wallH), ddX - 0.12, oy + drawH / 2, { align: 'center', angle: 90 });

  // Bottom dimension — first two ribs O.C. spacing
  if (params.count >= 2) {
    const sdY = oy + drawH + 0.22;
    const x1 = ox;
    const x2 = ox + params.spacing * s;
    pdf.line(x1, sdY, x2, sdY);
    pdf.line(x1, sdY - 0.04, x1, sdY + 0.04);
    pdf.line(x2, sdY - 0.04, x2, sdY + 0.04);
    pdf.setFontSize(7);
    pdf.setTextColor(60);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${params.spacing}" O.C.`, (x1 + x2) / 2, sdY + 0.13, { align: 'center' });
  }

  // Bottom-right callout — rib count
  pdf.setFontSize(7);
  pdf.setTextColor(60);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${params.count} RIBS @ ${params.spacing}" O.C.`, ox + drawW, oy + drawH + 0.42, { align: 'right' });
}

// ── PLAN (top view): wall line + rib rectangles with depth wave + dimensions
function drawPlanView(
  pdf: import('jspdf').jsPDF,
  params: RibParams,
  x: number, y: number, w: number, h: number,
) {
  const totalLen = (params.count - 1) * params.spacing;
  const maxDepth = params.maxDepth;

  // Title bar
  pdf.setFillColor(245, 245, 245);
  pdf.rect(x, y, w, 0.22, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(60);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PLAN  ·  TOP VIEW', x + w / 2, y + 0.15, { align: 'center' });

  const padTop = 0.7;
  const padBottom = 0.65;
  const padLeft = 0.65;
  const padRight = 0.4;
  const innerX = x + padLeft;
  const innerY = y + padTop;
  const innerW = w - padLeft - padRight;
  const innerH = h - padTop - padBottom;

  const sx = innerW / totalLen;
  const sy = innerH / maxDepth;
  const s = Math.min(sx, sy);
  const drawW = totalLen * s;
  const drawH = maxDepth * s;
  const ox = innerX + (innerW - drawW) / 2;
  const oy = innerY + (innerH - drawH) / 2;

  // Wall line at back
  pdf.setDrawColor(40);
  pdf.setLineWidth(0.02);
  pdf.line(ox - 0.05, oy + drawH, ox + drawW + 0.05, oy + drawH);

  // Ribs
  pdf.setDrawColor(40);
  pdf.setFillColor(232, 232, 232);
  pdf.setLineWidth(0.005);
  const ribDrawW = Math.max(params.thickness * s, 0.012);
  for (let i = 0; i < params.count; i++) {
    const cx = ox + i * params.spacing * s;
    const t = i / Math.max(params.count - 1, 1);
    const wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * params.frequency * t + params.phase * 2 * Math.PI);
    const depth = params.minDepth + (params.maxDepth - params.minDepth) * wave;
    const rh = depth * s;
    pdf.rect(cx - ribDrawW / 2, oy + drawH - rh, ribDrawW, rh, 'FD');
  }

  // Top dim — total length
  const dimY = oy - 0.22;
  pdf.setDrawColor(120);
  pdf.setLineWidth(0.008);
  pdf.line(ox, dimY, ox + drawW, dimY);
  pdf.line(ox, dimY - 0.05, ox, dimY + 0.05);
  pdf.line(ox + drawW, dimY - 0.05, ox + drawW, dimY + 0.05);
  pdf.setFontSize(8);
  pdf.setTextColor(50);
  pdf.setFont('helvetica', 'bold');
  pdf.text(fmtFt(totalLen), ox + drawW / 2, dimY - 0.06, { align: 'center' });

  // Left dim — max depth
  const ddX = ox - 0.28;
  pdf.line(ddX, oy, ddX, oy + drawH);
  pdf.line(ddX - 0.05, oy, ddX + 0.05, oy);
  pdf.line(ddX - 0.05, oy + drawH, ddX + 0.05, oy + drawH);
  pdf.setFontSize(8);
  pdf.setTextColor(50);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${params.maxDepth}"`, ddX - 0.12, oy + drawH / 2, { align: 'center', angle: 90 });

  // Bottom callout — depth range
  pdf.setFontSize(7);
  pdf.setTextColor(60);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`DEPTH: ${params.minDepth}" MIN · ${params.maxDepth}" MAX  (wave)`, ox + drawW / 2, oy + drawH + 0.42, { align: 'center' });
}

export async function exportRibShopDrawingPDF(
  params: RibParams,
  installationMode: InstallationMode,
  ledEnabled: boolean,
) {
  const { default: jsPDF } = await import('jspdf');
  // Landscape Letter — 11" × 8.5"
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });
  const pageW = 11, pageH = 8.5;
  const margin = 0.4;
  const drawingCode = generateDrawingCode(params, installationMode, ledEnabled);
  const pricing = calculatePricing(params, installationMode, ledEnabled);

  // Title block taller (1.55) to fit scope column; footer 0.4
  const tbH = 1.55;
  const footerH = 0.4;
  const tbY = pageH - margin - footerH - tbH;

  // Top half: ELEVATION on left, PLAN on right
  const topY = margin;
  const topH = tbY - margin - 0.45; // headroom for pricing strip
  const topW = pageW - 2 * margin;
  const gap = 0.2;
  const halfW = (topW - gap) / 2;

  // Drawing borders
  pdf.setDrawColor(60);
  pdf.setLineWidth(0.012);
  pdf.rect(margin, topY, halfW, topH);
  pdf.rect(margin + halfW + gap, topY, halfW, topH);

  drawElevationView(pdf, params, margin, topY, halfW, topH);
  drawPlanView(pdf, params, margin + halfW + gap, topY, halfW, topH);

  // ─── Pricing strip (right of title block top edge) ──────────────
  const pricingX = pageW - margin - 0.1;
  // Single clean line: "Estimated Total" + amount, right-aligned
  const pricingY = tbY - 0.18;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(110);
  pdf.text('Estimated Total', pricingX - 1.6, pricingY, { align: 'right' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(20);
  pdf.text(fmtUSD(pricing.totalPrice), pricingX, pricingY + 0.02, { align: 'right' });

  // ─── Title block (4 columns) ─────────────────────────────────────
  pdf.setDrawColor(50);
  pdf.setLineWidth(0.02);
  pdf.rect(margin, tbY, pageW - 2 * margin, tbH);

  // Column dividers
  const col1End = margin + 2.2;
  const col2End = margin + 4.95;
  const col3End = margin + 8.0;
  pdf.line(col1End, tbY, col1End, tbY + tbH);
  pdf.line(col2End, tbY, col2End, tbY + tbH);
  pdf.line(col3End, tbY, col3End, tbY + tbH);

  // ── Col 1: Brand ────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(20);
  pdf.text('M|R RIBS', margin + 0.15, tbY + 0.32);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(80);
  pdf.text('Design Custom', margin + 0.15, tbY + 0.5);
  pdf.setFontSize(7);
  pdf.setTextColor(110);
  pdf.text('Mario Romano Walls', margin + 0.15, tbY + 0.72);
  pdf.text('2314 Michigan Ave', margin + 0.15, tbY + 0.84);
  pdf.text('Santa Monica, CA 90404', margin + 0.15, tbY + 0.96);
  pdf.text('310-243-6967', margin + 0.15, tbY + 1.08);
  pdf.text('marioromano.com', margin + 0.15, tbY + 1.2);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(120);
  pdf.text('CO-RIB-01', margin + 0.15, tbY + tbH - 0.1);

  // ── Col 2: Project Specs ────────────────────────────────────────
  const c2x = col1End + 0.12;
  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.setFont('helvetica', 'normal');
  pdf.text('PROJECT  ·  SPEC', c2x, tbY + 0.18);
  pdf.setFontSize(11);
  pdf.setTextColor(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Rib Wall', c2x, tbY + 0.36);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const totalLen = (params.count - 1) * params.spacing;
  const heightLabel = installationMode === 'both'
    ? `${fmtFt(params.height)} wall + ${fmtFt(params.ceilingRun)} clg`
    : fmtFt(params.height);
  const specs: [string, string][] = [
    ['Wall', `${fmtFt(totalLen)} L × ${heightLabel} H`],
    ['Rib Qty', `${params.count} ribs`],
    ['Spacing', `${params.spacing}" O.C.`],
    ['Depth', `${params.minDepth}"–${params.maxDepth}"  (wave)`],
    ['Thickness', `${params.thickness}"`],
    ['Material', 'Corian, Glacier White'],
    ['Connection', 'Mech. · Aluminum U-Channel'],
  ];
  let sy = tbY + 0.55;
  for (const [k, v] of specs) {
    pdf.setTextColor(120);
    pdf.text(k, c2x, sy);
    pdf.setTextColor(30);
    pdf.text(v, c2x + 0.85, sy);
    sy += 0.13;
  }

  // ── Col 3: Scope / Included ─────────────────────────────────────
  const c3x = col2End + 0.12;
  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.setFont('helvetica', 'normal');
  pdf.text('SCOPE  ·  INCLUDED', c3x, tbY + 0.18);
  pdf.setFontSize(10);
  pdf.setTextColor(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Turn-Key Fabrication', c3x, tbY + 0.36);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(40);
  const scope = [
    `Corian ribs (qty ${params.count}) — CNC machined`,
    'Aluminum U-Channel hardware',
    'Attachment brackets',
    'Each piece labeled & laser-etched (rib #)',
    'Materials & installation map',
    'Exterior-rated assembly',
    'Shop drawings + DXF cut files',
  ];
  let scy = tbY + 0.55;
  for (const item of scope) {
    pdf.setTextColor(80);
    pdf.text('•', c3x, scy);
    pdf.setTextColor(40);
    pdf.text(item, c3x + 0.13, scy);
    scy += 0.13;
  }

  // ── Col 4: Drawing Info ─────────────────────────────────────────
  const c4x = col3End + 0.12;
  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.setFont('helvetica', 'normal');
  pdf.text('DRAWING', c4x, tbY + 0.18);
  pdf.setFontSize(10);
  pdf.setTextColor(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Shop Drawing', c4x, tbY + 0.36);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const installLabel = installationMode.charAt(0).toUpperCase() + installationMode.slice(1);
  const rightSpecs: [string, string][] = [
    ['Code', drawingCode],
    ['Sheet', 'SD1'],
    ['Scale', 'NTS'],
    ['Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })],
    ['Install', installLabel],
    ['Total Ribs', `${params.count}`],
    ['Total Sheets', `${pricing.sheetsNeeded}  (48"×144")`],
  ];
  let ry = tbY + 0.55;
  for (const [k, v] of rightSpecs) {
    pdf.setTextColor(120);
    pdf.text(k, c4x, ry);
    pdf.setTextColor(30);
    if (k === 'Code') {
      pdf.setFont('courier', 'bold');
      pdf.setFontSize(7.5);
      pdf.text(v, c4x + 0.6, ry);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
    } else {
      pdf.text(v, c4x + 0.85, ry);
    }
    ry += 0.13;
  }

  // ─── Legal footer ────────────────────────────────────────────────
  const footerY = tbY + tbH + 0.08;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(6.5);
  pdf.setTextColor(110);
  pdf.text(
    'By signing, client acknowledges all dimensions, rib counts, and installation details are correct. Once signed, this document is used for fabrication; no further changes can be made.',
    margin + 0.15,
    footerY,
    { maxWidth: pageW - 2 * margin - 0.3 },
  );
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(80);
  pdf.text(
    'PROPRIETARY: This design and drawing are the intellectual property of Mario Romano Walls. The product depicted herein may only be manufactured by M|R Walls. Reproduction, duplication, or fabrication by any third party is prohibited.',
    margin + 0.15,
    footerY + 0.13,
    { maxWidth: pageW - 2 * margin - 0.3 },
  );

  pdf.save(`${drawingCode}.pdf`);
}

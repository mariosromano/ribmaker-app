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

// MRW-FIN-YYYYMMDD-XXXX — suffix is hash of params so the same design re-exports the same code
function generateDrawingCode(params: RibParams, installationMode: InstallationMode, ledEnabled: boolean): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const sig = `${params.count}x${params.spacing}x${params.height}x${params.minDepth}x${params.maxDepth}x${params.thickness}x${params.frequency}x${params.phase}x${params.waveType}x${installationMode}x${ledEnabled ? 1 : 0}`;
  let hash = 0;
  for (let i = 0; i < sig.length; i++) hash = ((hash << 5) - hash + sig.charCodeAt(i)) | 0;
  const suffix = Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
  return `MRW-FIN-${ymd}-${suffix}`;
}

// ── ELEVATION (front view): wall outline + vertical rib edges + dimensions
function drawElevationView(
  pdf: import('jspdf').jsPDF,
  params: RibParams,
  installationMode: InstallationMode,
  x: number, y: number, w: number, h: number,
) {
  const totalLen = (params.count - 1) * params.spacing;
  // params.height = vertical wall extent (wall mode) OR rib horizontal
  // length across ceiling (ceiling mode). Same data, different orientation.
  const wallH = params.height;
  const isCeilingOnly = installationMode === 'ceiling';

  // Title bar at top of box
  pdf.setFillColor(245, 245, 245);
  pdf.rect(x, y, w, 0.22, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(60);
  pdf.setFont('helvetica', 'bold');
  const titleLabel = isCeilingOnly ? 'REFLECTED CEILING PLAN' :
                     installationMode === 'both' ? 'WALL ELEVATION  ·  FRONT VIEW' :
                     'ELEVATION  ·  FRONT VIEW';
  pdf.text(titleLabel, x + w / 2, y + 0.15, { align: 'center' });

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
  if (isCeilingOnly) {
    pdf.setFontSize(7);
    pdf.setTextColor(120);
    pdf.setFont('helvetica', 'normal');
    pdf.text('CEILING RUN', ddX - 0.24, oy + drawH / 2, { align: 'center', angle: 90 });
  }

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
  pdf.text(`${params.count} FINS @ ${params.spacing}" O.C.`, ox + drawW, oy + drawH + 0.42, { align: 'right' });
}

// ── SECTION (side cut showing L-profile for Both mode)
function drawSectionView(
  pdf: import('jspdf').jsPDF,
  params: RibParams,
  x: number, y: number, w: number, h: number,
) {
  const wallH = params.height;            // vertical extent
  const ceilRun = params.ceilingRun;      // horizontal extent
  const maxDepth = params.maxDepth;       // depth from wall AND below ceiling

  // Title bar
  pdf.setFillColor(245, 245, 245);
  pdf.rect(x, y, w, 0.22, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(60);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SECTION  ·  L-PROFILE (typ.)', x + w / 2, y + 0.15, { align: 'center' });

  const padTop = 0.7;
  const padBottom = 0.65;
  const padLeft = 0.7;
  const padRight = 0.5;
  const innerX = x + padLeft;
  const innerY = y + padTop;
  const innerW = w - padLeft - padRight;
  const innerH = h - padTop - padBottom;

  // The L-shape footprint: wall is on the right going up, ceiling extends left at the top
  // Total width of the section = ceilRun + maxDepth (ceiling extent + wall thickness/depth)
  // Total height of section = wallH + maxDepth
  const sectW = ceilRun + maxDepth;
  const sectH = wallH + maxDepth;
  const sx = innerW / sectW;
  const sy = innerH / sectH;
  const s = Math.min(sx, sy);

  const drawW = sectW * s;
  const drawH = sectH * s;
  const ox = innerX + (innerW - drawW) / 2;
  const oy = innerY + (innerH - drawH) / 2;

  // Wall corner is at the right side, going up the full height
  // Ceiling extends from the wall corner to the left at the TOP
  // Coordinates (relative to ox, oy):
  //   wall back-line:    x = drawW - maxDepth*s    (vertical line up wallH)
  //   ceiling top-line:  y = 0                     (horizontal line from x=0 to drawW - maxDepth*s)
  //   wall bottom:       y = drawH                 (where wall meets floor)

  const wallBackX = ox + drawW - maxDepth * s;
  const ceilTopY = oy;
  const wallBottomY = oy + drawH;

  // Draw structural lines: wall back, ceiling top
  pdf.setDrawColor(40);
  pdf.setLineWidth(0.02);
  pdf.line(wallBackX, ceilTopY, wallBackX, wallBottomY);    // wall (vertical back)
  pdf.line(ox, ceilTopY, wallBackX, ceilTopY);              // ceiling (horizontal top)

  // Draw a representative rib L-profile (wall portion + ceiling portion)
  // Wall section depth varies; ceiling section depth varies. Use mid-depth for clarity.
  const midDepth = (params.minDepth + params.maxDepth) / 2;

  pdf.setDrawColor(80);
  pdf.setFillColor(220, 220, 220);
  pdf.setLineWidth(0.005);

  // Wall portion: rectangle protruding from wall back, extends LEFT for midDepth
  const wallRibW = midDepth * s;
  pdf.rect(wallBackX - wallRibW, ceilTopY, wallRibW, drawH - maxDepth * s, 'FD');

  // Ceiling portion: rectangle below ceiling, extends DOWN for midDepth, runs from corner left for ceilRun
  const ceilRibH = midDepth * s;
  pdf.rect(ox, ceilTopY, ceilRun * s, ceilRibH, 'FD');

  // Dimension lines
  pdf.setDrawColor(120);
  pdf.setLineWidth(0.008);
  pdf.setFontSize(8);
  pdf.setTextColor(50);
  pdf.setFont('helvetica', 'bold');

  // Right side — wall height
  const dimRX = ox + drawW + 0.18;
  pdf.line(dimRX, ceilTopY, dimRX, wallBottomY);
  pdf.line(dimRX - 0.05, ceilTopY, dimRX + 0.05, ceilTopY);
  pdf.line(dimRX - 0.05, wallBottomY, dimRX + 0.05, wallBottomY);
  pdf.text(fmtFt(wallH + maxDepth), dimRX + 0.12, (ceilTopY + wallBottomY) / 2, { align: 'center', angle: 90 });

  // Top — ceiling run
  const dimTY = ceilTopY - 0.18;
  pdf.line(ox, dimTY, wallBackX, dimTY);
  pdf.line(ox, dimTY - 0.05, ox, dimTY + 0.05);
  pdf.line(wallBackX, dimTY - 0.05, wallBackX, dimTY + 0.05);
  pdf.text(fmtFt(ceilRun), (ox + wallBackX) / 2, dimTY - 0.06, { align: 'center' });

  // Callouts
  pdf.setFontSize(7);
  pdf.setTextColor(60);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`MAX DEPTH ${params.maxDepth}"`, ox + drawW / 2, oy + drawH + 0.42, { align: 'center' });
  pdf.text(`RIB SHOWN AT MID-DEPTH (${midDepth}")`, ox + drawW / 2, oy + drawH + 0.55, { align: 'center' });
}

// ── PLAN (top view) for wall/ceiling, SECTION for both
function drawPlanView(
  pdf: import('jspdf').jsPDF,
  params: RibParams,
  installationMode: InstallationMode,
  x: number, y: number, w: number, h: number,
) {
  const totalLen = (params.count - 1) * params.spacing;
  const maxDepth = params.maxDepth;
  const isBoth = installationMode === 'both';

  // For Both mode, switch to a SECTION view that shows the L-profile of
  // a single rib (wall portion vertical, ceiling portion horizontal).
  if (isBoth) {
    drawSectionView(pdf, params, x, y, w, h);
    return;
  }

  // Title bar
  pdf.setFillColor(245, 245, 245);
  pdf.rect(x, y, w, 0.22, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(60);
  pdf.setFont('helvetica', 'bold');
  const title = installationMode === 'ceiling'
    ? 'PLAN  ·  CEILING SECTION'
    : 'PLAN  ·  TOP VIEW';
  pdf.text(title, x + w / 2, y + 0.15, { align: 'center' });

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

// Public helper — returns the drawing code without building the PDF.
export function getRibDrawingCode(
  params: RibParams,
  installationMode: InstallationMode,
  ledEnabled: boolean,
): string {
  return generateDrawingCode(params, installationMode, ledEnabled);
}

async function _buildPdf(
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

  drawElevationView(pdf, params, installationMode, margin, topY, halfW, topH);
  drawPlanView(pdf, params, installationMode, margin + halfW + gap, topY, halfW, topH);

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
  pdf.text('M|R FINS', margin + 0.15, tbY + 0.32);
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
  pdf.text('CO-FIN-01', margin + 0.15, tbY + tbH - 0.1);

  // ── Col 2: Project Specs ────────────────────────────────────────
  const c2x = col1End + 0.12;
  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.setFont('helvetica', 'normal');
  pdf.text('PROJECT  ·  SPEC', c2x, tbY + 0.18);
  pdf.setFontSize(11);
  pdf.setTextColor(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Fin Wall', c2x, tbY + 0.36);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const totalLen = (params.count - 1) * params.spacing;
  const heightLabel = installationMode === 'both'
    ? `${fmtFt(params.height)} wall + ${fmtFt(params.ceilingRun)} clg`
    : fmtFt(params.height);
  const specs: [string, string][] = [
    ['Wall', `${fmtFt(totalLen)} L × ${heightLabel} H`],
    ['Fin Qty', `${params.count} fins`],
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
    `Corian fins (qty ${params.count}) — CNC machined`,
    'Aluminum U-Channel hardware',
    'Attachment brackets',
    'Each piece labeled & laser-etched (fin #)',
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
    ['Total Fins', `${params.count}`],
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
    'By signing, client acknowledges all dimensions, fin counts, and installation details are correct. Once signed, this document is used for fabrication; no further changes can be made.',
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

  return { pdf, drawingCode };
}

// Build the PDF and return base64 + blob + code (no download triggered).
// Used by the quote pipeline so the API can store it in Airtable and the
// client can trigger its own download from the blob.
export async function buildRibShopDrawingPDF(
  params: RibParams,
  installationMode: InstallationMode,
  ledEnabled: boolean,
): Promise<{ code: string; pdfBase64: string; pdfBlob: Blob; filename: string }> {
  const { pdf, drawingCode } = await _buildPdf(params, installationMode, ledEnabled);
  const dataUri = pdf.output('datauristring') as string;
  const pdfBase64 = dataUri.replace(/^data:application\/pdf;[^,]*,/, '');
  const pdfBlob = pdf.output('blob') as Blob;
  return { code: drawingCode, pdfBase64, pdfBlob, filename: `${drawingCode}.pdf` };
}

// Build + immediately save (original behaviour — kept for any caller still using it).
export async function exportRibShopDrawingPDF(
  params: RibParams,
  installationMode: InstallationMode,
  ledEnabled: boolean,
) {
  const { pdf, drawingCode } = await _buildPdf(params, installationMode, ledEnabled);
  pdf.save(`${drawingCode}.pdf`);
}

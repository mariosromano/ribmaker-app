import * as THREE from 'three';
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

// Capture the live 3D viewport as a PNG data URL
function captureViewport(
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>,
  sceneRef: React.MutableRefObject<THREE.Scene | null>,
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>,
): string | null {
  const renderer = rendererRef.current;
  const scene = sceneRef.current;
  const camera = cameraRef.current;
  if (!renderer || !scene || !camera) return null;
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
}

// Draw a top-view schematic of the rib array with dimension lines
function drawTopViewSchematic(
  pdf: import('jspdf').jsPDF,
  params: RibParams,
  x: number, y: number, w: number, h: number,
) {
  const totalLen = (params.count - 1) * params.spacing; // inches, total array length center-to-center
  const maxDepth = params.maxDepth;

  // Reserve space inside the box for dimension lines (top + bottom + left + right margins)
  const padTop = 0.35;     // for top dim line (length)
  const padBottom = 0.55;  // for label
  const padLeft = 0.55;    // for depth dim
  const padRight = 0.4;
  const innerX = x + padLeft;
  const innerY = y + padTop;
  const innerW = w - padLeft - padRight;
  const innerH = h - padTop - padBottom;

  // Scale: fit (totalLen × maxDepth) into innerW × innerH
  const sx = innerW / totalLen;
  const sy = innerH / maxDepth;
  const s = Math.min(sx, sy);
  const drawW = totalLen * s;
  const drawH = maxDepth * s;
  const ox = innerX + (innerW - drawW) / 2;
  const oy = innerY + (innerH - drawH) / 2;

  // Wall line (back of ribs)
  pdf.setDrawColor(60);
  pdf.setLineWidth(0.02);
  pdf.line(ox - 0.05, oy + drawH, ox + drawW + 0.05, oy + drawH);

  // Each rib as a thin vertical rectangle (top-view shows length × depth)
  pdf.setDrawColor(40);
  pdf.setFillColor(232, 232, 232);
  pdf.setLineWidth(0.005);
  const ribDrawW = Math.max(params.thickness * s, 0.012);
  for (let i = 0; i < params.count; i++) {
    const cx = ox + i * params.spacing * s;
    // Depth varies with sine — represent as average depth here for schematic
    // For visual: alternate min/max so the wave is readable
    const t = i / Math.max(params.count - 1, 1);
    const wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * params.frequency * t + params.phase * 2 * Math.PI);
    const depth = params.minDepth + (params.maxDepth - params.minDepth) * wave;
    const rh = depth * s;
    pdf.rect(cx - ribDrawW / 2, oy + drawH - rh, ribDrawW, rh, 'FD');
  }

  // Top dimension line — total length
  const dimY = oy - 0.18;
  pdf.setDrawColor(120);
  pdf.setLineWidth(0.008);
  pdf.line(ox, dimY, ox + drawW, dimY);
  pdf.line(ox, dimY - 0.05, ox, dimY + 0.05);
  pdf.line(ox + drawW, dimY - 0.05, ox + drawW, dimY + 0.05);
  pdf.setFontSize(8);
  pdf.setTextColor(60);
  pdf.text(fmtFt(totalLen), ox + drawW / 2, dimY - 0.06, { align: 'center' });

  // Spacing dimension between first two ribs
  if (params.count >= 2) {
    const x1 = ox;
    const x2 = ox + params.spacing * s;
    const sdY = oy + drawH + 0.18;
    pdf.line(x1, sdY, x2, sdY);
    pdf.line(x1, sdY - 0.04, x1, sdY + 0.04);
    pdf.line(x2, sdY - 0.04, x2, sdY + 0.04);
    pdf.setFontSize(7);
    pdf.text(`${params.spacing}" O.C.`, (x1 + x2) / 2, sdY + 0.12, { align: 'center' });
  }

  // Left dimension line — max depth
  const ddX = ox - 0.18;
  pdf.line(ddX, oy + drawH - drawH, ddX, oy + drawH);
  pdf.line(ddX - 0.04, oy + drawH - drawH, ddX + 0.04, oy + drawH - drawH);
  pdf.line(ddX - 0.04, oy + drawH, ddX + 0.04, oy + drawH);
  pdf.setFontSize(7);
  pdf.text(`${params.maxDepth}"`, ddX - 0.06, oy + drawH / 2, { align: 'right' });

  // Title for the schematic
  pdf.setFontSize(8);
  pdf.setTextColor(120);
  pdf.text('PLAN VIEW (rib depth varies with wave)', x + w / 2, y + h - 0.1, { align: 'center' });
}

export async function exportRibShopDrawingPDF(
  params: RibParams,
  installationMode: InstallationMode,
  ledEnabled: boolean,
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>,
  sceneRef: React.MutableRefObject<THREE.Scene | null>,
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>,
) {
  const { default: jsPDF } = await import('jspdf');
  // Landscape Letter — 11" × 8.5"
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });
  const pageW = 11, pageH = 8.5;
  const margin = 0.4;
  const drawingCode = generateDrawingCode(params, installationMode, ledEnabled);
  const pricing = calculatePricing(params, installationMode, ledEnabled);

  // Reserve: title block 1.2 + footer 0.4
  const tbH = 1.2;
  const footerH = 0.4;
  const tbY = pageH - margin - footerH - tbH;

  // Top half: 3D hero on left, plan-view schematic on right
  const topY = margin;
  const topH = tbY - margin - 0.35;
  const topW = pageW - 2 * margin;
  const heroW = topW * 0.58;
  const planW = topW - heroW - 0.2;
  const heroX = margin;
  const planX = margin + heroW + 0.2;

  // Hero — 3D viewport snapshot
  const heroImg = captureViewport(rendererRef, sceneRef, cameraRef);
  if (heroImg) {
    pdf.setDrawColor(180);
    pdf.setLineWidth(0.01);
    pdf.rect(heroX, topY, heroW, topH);
    pdf.addImage(heroImg, 'PNG', heroX + 0.02, topY + 0.02, heroW - 0.04, topH - 0.28);
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text('3D ELEVATION', heroX + heroW / 2, topY + topH - 0.1, { align: 'center' });
  }

  // Plan-view schematic
  pdf.setDrawColor(180);
  pdf.rect(planX, topY, planW, topH);
  drawTopViewSchematic(pdf, params, planX, topY, planW, topH);

  // ─── Pricing strip (above title block, right-aligned) ────────────
  const pricingX = pageW - margin - 0.1;
  const pricingY = tbY - 0.08;

  const pricingLines: [string, number][] = [
    ['Corian Ribs', pricing.ribPrice],
  ];
  if (ledEnabled) pricingLines.push(['LED Strip Lighting', pricing.ledPrice]);

  let py = pricingY - 0.3 - pricingLines.length * 0.18;
  for (const [label, cost] of pricingLines) {
    pdf.setTextColor(90);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, pricingX - 1.4, py, { align: 'right' });
    pdf.setTextColor(30);
    pdf.setFont('helvetica', 'bold');
    pdf.text(fmtUSD(cost), pricingX, py, { align: 'right' });
    py += 0.18;
  }

  pdf.setDrawColor(150);
  pdf.setLineWidth(0.01);
  pdf.line(pricingX - 1.8, py - 0.07, pricingX, py - 0.07);

  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.setFont('helvetica', 'normal');
  pdf.text('ESTIMATED TOTAL', pricingX - 1.4, py + 0.05, { align: 'right' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(20);
  pdf.text(fmtUSD(pricing.totalPrice), pricingX, py + 0.1, { align: 'right' });

  // ─── Title block ─────────────────────────────────────────────────
  pdf.setDrawColor(50);
  pdf.setLineWidth(0.02);
  pdf.rect(margin, tbY, pageW - 2 * margin, tbH);
  pdf.line(margin + 2.7, tbY, margin + 2.7, tbY + tbH);
  pdf.line(margin + 6.4, tbY, margin + 6.4, tbY + tbH);

  // Left — brand
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(30);
  pdf.text('M|R Walls', margin + 0.15, tbY + 0.28);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(80);
  pdf.text('Mario Romano Walls', margin + 0.15, tbY + 0.48);
  pdf.text('2314 Michigan Ave, Santa Monica, CA 90404', margin + 0.15, tbY + 0.62);
  pdf.text('310-243-6967  ·  marioromano.com', margin + 0.15, tbY + 0.76);
  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.text('CO-RIB-01', margin + 0.15, tbY + tbH - 0.1);

  // Middle — project spec
  const mx = margin + 2.85;
  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.text('PROJECT', mx, tbY + 0.18);
  pdf.setFontSize(11);
  pdf.setTextColor(30);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Rib Wall', mx, tbY + 0.38);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const totalLen = (params.count - 1) * params.spacing;
  const heightLabel = installationMode === 'both'
    ? `${fmtFt(params.height)} wall + ${fmtFt(params.ceilingRun)} ceiling`
    : fmtFt(params.height);
  const specs: [string, string][] = [
    ['Wall', `${fmtFt(totalLen)} L × ${heightLabel} H`],
    ['Ribs', `${params.count} @ ${params.spacing}" O.C.`],
    ['Depth', `${params.minDepth}" min · ${params.maxDepth}" max`],
    ['Material', `Corian, ${params.thickness}" Glacier White`],
    ['Connection', 'Mechanical · Aluminum U-Channel'],
  ];
  let sy = tbY + 0.56;
  for (const [k, v] of specs) {
    pdf.setTextColor(120);
    pdf.text(k, mx, sy);
    pdf.setTextColor(30);
    pdf.text(v, mx + 1.0, sy);
    sy += 0.12;
  }

  // Right — drawing info
  const rx = margin + 6.55;
  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.text('DRAWING TYPE', rx, tbY + 0.18);
  pdf.setFontSize(11);
  pdf.setTextColor(30);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Shop Drawing', rx, tbY + 0.38);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const installLabel = installationMode.charAt(0).toUpperCase() + installationMode.slice(1);
  const rightSpecs: [string, string][] = [
    ['Code', drawingCode],
    ['Sheet', 'SD1'],
    ['Scale', 'NTS'],
    ['Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })],
    ['Install', installLabel],
  ];
  let ry = tbY + 0.56;
  for (const [k, v] of rightSpecs) {
    pdf.setTextColor(120);
    pdf.text(k, rx, ry);
    pdf.setTextColor(30);
    if (k === 'Code') {
      pdf.setFont('courier', 'bold');
      pdf.text(v, rx + 0.5, ry);
      pdf.setFont('helvetica', 'normal');
    } else {
      pdf.text(v, rx + 0.85, ry);
    }
    ry += 0.15;
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

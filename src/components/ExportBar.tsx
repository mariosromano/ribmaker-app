import { useCallback, useState } from 'react';
import * as Sentry from '@sentry/react';
import * as THREE from 'three';
import { track, identify } from '../analytics';
import type { RibParams, RibProfile, InstallationMode } from '../engine/types';
import { exportDXF, calculatePricing } from '../engine/ribEngine';
import { buildRibShopDrawingPDF } from '../engine/shopDrawingPDF';

interface ExportBarProps {
  params: RibParams;
  ribProfiles: RibProfile[];
  installationMode: InstallationMode;
  ledEnabled: boolean;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}

function fmtFt(inches: number): string {
  const ft = Math.floor(inches / 12);
  const rem = +(inches - ft * 12).toFixed(1);
  if (rem === 0) return `${ft}'`;
  return `${ft}'-${rem}"`;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function ExportBar({
  params,
  ribProfiles,
  installationMode,
  ledEnabled,
  rendererRef,
  sceneRef,
  cameraRef,
}: ExportBarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('ribmaker_quote_email') || '';
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const handleExportImage = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = 'mr-fins-preview.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
  }, [rendererRef, sceneRef, cameraRef]);

  const handleGenerateQuote = useCallback(async () => {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem('ribmaker_quote_email', email);

      // 1. Build the PDF (returns base64 + blob + code)
      const { code, pdfBase64, pdfBlob, filename } =
        await buildRibShopDrawingPDF(params, installationMode, ledEnabled);

      // 2. Build the DXF (cut files)
      const dxfText = ribProfiles.length ? exportDXF(ribProfiles, params) : '';

      // 3. Build the human-readable wall spec + pricing summary
      const pricing = calculatePricing(params, installationMode, ledEnabled);
      const totalLen = (params.count - 1) * params.spacing;
      const wallSpec =
        `${fmtFt(totalLen)} wide × ${fmtFt(params.height)} tall · ` +
        `${params.count} fins @ ${params.spacing}" O.C. · ` +
        `depth ${params.minDepth}–${params.maxDepth}" · ` +
        `${pricing.sheetsNeeded} sheets · ` +
        `install: ${installationMode}`;

      // 4. POST to /api/quote — save the row + attachments in Airtable
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code,
          designJSON: JSON.stringify(params),
          wallSpec,
          totalPrice: pricing.totalPrice,
          pdfBase64,
          pdfFilename: filename,
          dxfText,
          dxfFilename: `${code}.dxf`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      // 5. Trigger client-side PDF download from the blob (instant, no email needed)
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Analytics: the conversion event. Identify the user by email so all
      // their prior anonymous slider-fiddling and renders get linked.
      identify(email, { last_quote_code: code });
      track('quote_generated', {
        code,
        total_price: pricing.totalPrice,
        rib_count: params.count,
        height_in: params.height,
        max_depth_in: params.maxDepth,
        min_depth_in: params.minDepth,
        spacing_in: params.spacing,
        install_mode: installationMode,
        sheets_needed: pricing.sheetsNeeded,
        min_order_applied: pricing.minOrderApplied,
      });

      setSuccessCode(code);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: 'quote-pipeline' },
        extra: { email, designParams: params, installationMode },
      });
      track('quote_failed', { error: err instanceof Error ? err.message : 'unknown' });
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }, [email, params, installationMode, ledEnabled, ribProfiles]);

  const closeModal = () => {
    setModalOpen(false);
    setError(null);
    setSuccessCode(null);
  };

  return (
    <>
      <div className="bg-[#3a3a42] rounded-lg p-4 mb-3">
        <div className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2.5">Export</div>
        <div className="space-y-1.5">
          <button
            className="w-full py-2.5 rounded-md bg-[#7c9bff] hover:bg-[#6b8aee] text-white text-xs font-medium transition-colors"
            onClick={() => setModalOpen(true)}
          >
            Shop Drawing + Quote
          </button>
          <button
            className="w-full py-2.5 rounded-md bg-[#4a4a52] hover:bg-[#5a5a62] text-white text-xs font-medium transition-colors"
            onClick={handleExportImage}
          >
            Download Image
          </button>
        </div>
      </div>

      {/* Email-gate modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center px-4"
          onClick={closeModal}
        >
          <div
            className="bg-[#2a2a30] rounded-xl border border-[#3a3a42] shadow-[0_24px_80px_rgba(0,0,0,0.6)] w-full max-w-[440px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {!successCode ? (
              <>
                <div className="text-[18px] font-bold text-white mb-1">Get Your Shop Drawing &amp; Quote</div>
                <div className="text-[12px] text-[#aaa] mb-5">
                  We&apos;ll save your quote and give you a reference code. Valid 180 days.
                </div>

                <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !busy) handleGenerateQuote(); }}
                  placeholder="you@firm.com"
                  className="w-full px-3 py-2.5 bg-[#1a1a1f] border border-[#3a3a42] rounded-md text-white text-[14px] outline-none focus:border-[#7c9bff] mb-4"
                  disabled={busy}
                />

                {error && (
                  <div className="mb-4 px-3 py-2 rounded bg-[#4a2a2a] text-[#ff6b6b] text-[12px]">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={closeModal}
                    disabled={busy}
                    className="flex-1 py-2.5 rounded-md bg-[#4a4a52] hover:bg-[#5a5a62] text-white text-[13px] font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateQuote}
                    disabled={busy || !email}
                    className="flex-1 py-2.5 rounded-md bg-[#7c9bff] hover:bg-[#6b8aee] text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
                  >
                    {busy ? 'Generating…' : 'Get Shop Drawing'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-[20px] font-bold text-white mb-2">Thank you ✓</div>
                <div className="text-[13px] text-[#ccc] mb-5 leading-relaxed">
                  Your shop drawing and quote are in your downloads folder.
                </div>
                <button
                  onClick={closeModal}
                  className="w-full py-2.5 rounded-md bg-[#7c9bff] hover:bg-[#6b8aee] text-white text-[13px] font-semibold transition-colors"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface InstallationGuideProps {
  open: boolean;
  onClose: () => void;
}

export default function InstallationGuide({ open, onClose }: InstallationGuideProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="relative bg-[#1a1a1f] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-[92vw] max-w-[900px] h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3a3a42]">
          <div>
            <div className="text-[16px] font-bold text-white">Installation Guide</div>
            <div className="text-[11px] text-[#888] mt-0.5">M|R Fins · Mechanical assembly</div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-md text-white bg-[#3a3a42] hover:bg-[#5a5a62] border border-[#5a5a62] flex items-center justify-center text-2xl leading-none font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-8">
            <div className="text-[#7c9bff] font-bold text-[13px] mb-1">STEP 1.1</div>
            <div className="text-white font-semibold mb-2">Fin into channel</div>
            <p className="text-[#ccc] text-[12px] leading-relaxed mb-3">
              Align the channel with the "L"-shaped engraving on the fin and firmly press the fin
              into the channel until the slots line up with the holes in the channel. Grip strips
              applied between the slots ensure a snug fit. The first hole on the channel is 4"
              from the top.
            </p>
            <img
              src="/installation/step-1.png"
              alt="Step 1.1 — fin into channel"
              className="w-full rounded border border-[#3a3a42] bg-white"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>

          <div className="mb-8">
            <div className="text-[#7c9bff] font-bold text-[13px] mb-1">STEP 1.2</div>
            <div className="text-white font-semibold mb-2">L-bracket fastening</div>
            <p className="text-[#ccc] text-[12px] leading-relaxed mb-3">
              Align the slot on the shorter flange of the L-bracket with the hole on the channel
              on both sides. Use the provided nuts and bolts to secure the group together, then
              fasten the fin to the channel through the remaining holes.
            </p>
            <img
              src="/installation/step-2.png"
              alt="Step 1.2 — L-bracket fastening"
              className="w-full rounded border border-[#3a3a42] bg-white"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>

          <div className="mb-4">
            <div className="text-[#7c9bff] font-bold text-[13px] mb-1">DETAIL A</div>
            <div className="text-white font-semibold mb-2">Bracket close-up</div>
            <p className="text-[#ccc] text-[12px] leading-relaxed mb-3">
              Detail view of the L-bracket secured through the channel slot.
            </p>
            <img
              src="/installation/step-2-detail.png"
              alt="Detail A — bracket close-up"
              className="w-full rounded border border-[#3a3a42] bg-white"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>

          <div className="mt-6 p-4 rounded-md bg-[#2a2a30] border border-[#3a3a42]">
            <div className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">Included Hardware</div>
            <ul className="text-[12px] text-[#ccc] space-y-1 list-disc list-inside">
              <li>Aluminum U-channel (mounted to wall first)</li>
              <li>L-brackets, nuts &amp; bolts (qty per fin)</li>
              <li>Each fin labeled &amp; etched for placement</li>
              <li>Materials &amp; install map included with shipment</li>
              <li>Exterior-rated assembly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

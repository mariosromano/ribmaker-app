import { useEffect, useState, useCallback } from 'react';

// Real M|R Walls installs. Filenames live in /public/gallery/.
// Add more here as photos come in — no other code change needed.
const PHOTOS = [
  '/gallery/Slate-Corner-exterior-Findusk.jpg',
  '/gallery/slate Texax Facade.png',
  '/gallery/FIN wall slat.png',
  '/gallery/Ribs - Fins 2.png',
  '/gallery/Ribs-hotel.png',
  '/gallery/Slat-MR-Walls-Sunny-9.png',
];

interface GalleryProps {
  open: boolean;
  onClose: () => void;
}

export default function Gallery({ open, onClose }: GalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const close = useCallback(() => {
    setLightboxIndex(null);
    onClose();
  }, [onClose]);

  // Keyboard navigation: Esc to close, arrows to navigate lightbox
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIndex !== null) setLightboxIndex(null);
        else close();
      } else if (lightboxIndex !== null) {
        if (e.key === 'ArrowRight') {
          setLightboxIndex((i) => (i === null ? 0 : (i + 1) % PHOTOS.length));
        } else if (e.key === 'ArrowLeft') {
          setLightboxIndex((i) => (i === null ? 0 : (i - 1 + PHOTOS.length) % PHOTOS.length));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, lightboxIndex, close]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 z-[60] overflow-y-auto"
        onClick={close}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/60 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <div className="text-[18px] font-bold tracking-tight text-[#d4af37]">
                M|R Walls — Recent Installs
              </div>
              <div className="text-[11px] font-mono tracking-widest uppercase text-[#888] mt-0.5">
                Built work
              </div>
            </div>
            <button
              onClick={close}
              className="text-white/70 hover:text-white text-2xl leading-none w-9 h-9 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close gallery"
            >
              ×
            </button>
          </div>
        </div>

        {/* Grid */}
        <div
          className="max-w-7xl mx-auto px-6 py-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PHOTOS.map((src, i) => (
              <button
                key={src}
                onClick={() => setLightboxIndex(i)}
                className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#1a1a1f] group cursor-zoom-in"
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <img
            src={PHOTOS[lightboxIndex]}
            alt=""
            className="max-w-[95vw] max-h-[95vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {/* Prev */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => (i === null ? 0 : (i - 1 + PHOTOS.length) % PHOTOS.length));
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center transition-colors"
            aria-label="Previous"
          >
            ‹
          </button>
          {/* Next */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => (i === null ? 0 : (i + 1) % PHOTOS.length));
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center transition-colors"
            aria-label="Next"
          >
            ›
          </button>
          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-[11px] font-mono tracking-widest">
            {lightboxIndex + 1} / {PHOTOS.length}
          </div>
          {/* Close */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

import type { ArFrame } from '../../services/eventService';
import { ensureImageUrl } from '../../services/eventService';
import type { PhotoboothLayout } from './PhotoboothCompositor';
import { PHOTOBOOTH_LAYOUT_META } from './PhotoboothCompositor';

interface LayoutSelectionScreenProps {
  frames: ArFrame[];
  selectedFrame: ArFrame | null;
  selectedLayout: PhotoboothLayout;
  onConfirm: (layout: PhotoboothLayout, frame: ArFrame | null) => void;
}

export default function LayoutSelectionScreen({
  frames,
  selectedFrame,
  selectedLayout,
  onConfirm,
}: LayoutSelectionScreenProps) {
  const layouts: PhotoboothLayout[] = ['strip1x2', 'grid2x2', 'grid2x4'];

  const renderLayoutPreview = (layout: PhotoboothLayout, isSelected: boolean) => {
    const activeColor = isSelected ? 'bg-pink-500/30 border-pink-500' : 'bg-white/5 border-white/10';
    const borderColor = isSelected ? 'border-pink-500' : 'border-white/20';

    if (layout === 'strip1x2') {
      return (
        <div className="flex flex-col gap-1.5 h-24 w-12 mx-auto justify-center">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={`flex-1 rounded border ${activeColor} ${borderColor}`} />
          ))}
        </div>
      );
    } else if (layout === 'grid2x2') {
      return (
        <div className="grid grid-cols-2 gap-1.5 h-24 w-16 mx-auto justify-center items-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-10 rounded border ${activeColor} ${borderColor}`} />
          ))}
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-2 gap-1 h-24 w-16 mx-auto justify-center items-center">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`h-4.5 rounded border ${activeColor} ${borderColor}`} />
          ))}
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col flex-1 px-5 py-4 overflow-y-auto max-w-md mx-auto w-full pb-32">
      {/* ── Bố cục ──────────────────────────────────── */}
      <div>
        <h2 className="text-white text-base font-bold">Chọn bố cục</h2>
        <p className="text-gray-400 text-xs mt-0.5">Chọn cách sắp xếp ảnh phù hợp cho Story</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        {layouts.map((layout) => {
          const isSelected = selectedLayout === layout;
          const meta = PHOTOBOOTH_LAYOUT_META[layout];

          return (
            <button
              key={layout}
              onClick={() => onConfirm(layout, selectedFrame)}
              className={`flex flex-col p-3 rounded-2xl border transition-all text-center ${
                isSelected
                  ? 'bg-pink-500/10 border-pink-500 shadow-lg shadow-pink-500/10'
                  : 'bg-white/5 border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex-1 flex items-center justify-center min-h-[100px]">
                {renderLayoutPreview(layout, isSelected)}
              </div>
              <span
                className={`text-xs font-bold mt-2 ${
                  isSelected ? 'text-pink-500' : 'text-white'
                }`}
              >
                {meta.label}
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5">{meta.photoCount} ảnh</span>
            </button>
          );
        })}
      </div>

      {/* ── Khung AR ────────────────────────────────── */}
      <div className="mt-8 flex justify-between items-center">
        <div>
          <h2 className="text-white text-base font-bold">Chọn khung AR</h2>
          <p className="text-gray-400 text-xs mt-0.5">Tùy chọn — Khung AR sẽ phủ lên toàn bộ ảnh</p>
        </div>
        {selectedFrame && (
          <button
            onClick={() => onConfirm(selectedLayout, null)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Bỏ chọn
          </button>
        )}
      </div>

      <div className="mt-4">
        {frames.length === 0 ? (
          <div className="h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
            Không có khung AR nào
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {frames.map((frame) => {
              const isSelected = selectedFrame?.id === frame.id;
              const imageUrl = ensureImageUrl(frame.assetUrl);

              return (
                <button
                  key={frame.id}
                  onClick={() => onConfirm(selectedLayout, frame)}
                  className={`flex flex-col p-2 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-pink-500/10 border-pink-500 shadow-lg shadow-pink-500/15'
                      : 'bg-white/5 border-transparent hover:border-white/20'
                  }`}
                >
                  <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-black/40 flex items-center justify-center p-1">
                    <img
                      src={imageUrl}
                      alt={frame.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-2 text-center truncate w-full ${
                      isSelected ? 'text-pink-500' : 'text-gray-400'
                    }`}
                  >
                    {frame.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bắt đầu chụp ──────────────────────────────── */}
      <div className="mt-8">
        <button
          onClick={() => onConfirm(selectedLayout, selectedFrame)}
          className="w-full py-4 bg-pink-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all shadow-lg shadow-pink-500/20"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Bắt đầu chụp {PHOTOBOOTH_LAYOUT_META[selectedLayout].photoCount} ảnh
        </button>
      </div>
    </div>
  );
}

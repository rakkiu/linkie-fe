import type { PhotoboothLayout } from './PhotoboothCompositor';
import { PHOTOBOOTH_LAYOUT_META } from './PhotoboothCompositor';

interface ReviewScreenProps {
  layout: PhotoboothLayout;
  capturedPhotos: string[];
  selectedIndices: number[];
  onToggleSelection: (index: number) => void;
  onRetake: () => void;
  onConfirm: () => void;
}

export default function ReviewScreen({
  layout,
  capturedPhotos,
  selectedIndices,
  onToggleSelection,
  onRetake,
  onConfirm,
}: ReviewScreenProps) {
  const meta = PHOTOBOOTH_LAYOUT_META[layout];
  const required = meta.photoCount;
  const isReady = selectedIndices.length >= required;

  return (
    <div className="flex flex-col flex-1 px-5 py-4 overflow-y-auto max-w-md mx-auto w-full pb-32">
      {/* ── Header Counter ─────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-base font-bold">Chọn ảnh cho khung</h2>
          <p className="text-gray-400 text-xs mt-0.5">Nhấn vào ảnh để chọn/bỏ chọn theo thứ tự</p>
        </div>
        <div
          className={`px-3 py-1.5 rounded-full border text-sm font-bold transition-colors ${
            isReady
              ? 'bg-pink-500/10 border-pink-500 text-pink-500'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
          }`}
        >
          {selectedIndices.length}/{required}
        </div>
      </div>

      {/* ── Photo Grid ──────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mt-6">
        {capturedPhotos.map((photo, i) => {
          const isSelected = selectedIndices.includes(i);
          const orderIndex = selectedIndices.indexOf(i);

          return (
            <button
              key={i}
              onClick={() => onToggleSelection(i)}
              className={`aspect-square w-full rounded-2xl overflow-hidden relative border-2 transition-all ${
                isSelected
                  ? 'border-pink-500 shadow-lg shadow-pink-500/20 scale-[0.98]'
                  : 'border-transparent'
              }`}
            >
              <img
                src={photo}
                alt={`Captured ${i + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Mờ ảnh nếu chưa chọn */}
              {!isSelected && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />
              )}

              {/* Badge số thứ tự */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-pink-500 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-pink-500/30">
                  {orderIndex + 1}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Mini Preview ────────────────────────────── */}
      {selectedIndices.length > 0 && (
        <div className="mt-8 p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Xem trước thứ tự ghép
          </span>
          <div className="flex gap-2 overflow-x-auto py-1">
            {selectedIndices.map((idx) => {
              if (idx >= capturedPhotos.length) return null;
              return (
                <div
                  key={idx}
                  className="w-14 aspect-[3/4] rounded-lg overflow-hidden border border-white/15 shrink-0"
                >
                  <img
                    src={capturedPhotos[idx]}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Buttons ─────────────────────────────────── */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={onRetake}
          className="flex-1 py-4 border border-white/10 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-all active:scale-[0.98]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Chụp thêm
        </button>

        <button
          onClick={onConfirm}
          disabled={!isReady}
          className="flex-[2] py-4 bg-pink-500 disabled:bg-white/5 disabled:text-gray-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all disabled:pointer-events-none"
        >
          Tiếp theo
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}

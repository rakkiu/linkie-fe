import { useEffect, useRef, useState } from 'react';
import type { ArFrame } from '../../services/eventService';
import { ensureImageUrl } from '../../services/eventService';
import type {
  PhotoboothLayout,
  StickerCategory,
  StickerItem,
} from './PhotoboothCompositor';
import { PhotoboothCompositor } from './PhotoboothCompositor';

// Polyfill for Canvas roundRect (iOS < 16)
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

interface EditScreenProps {
  layout: PhotoboothLayout;
  selectedPhotos: string[];
  selectedFrame: ArFrame | null;
  stickers: StickerItem[];
  isFrontCamera: boolean;
  onAddSticker: (sticker: StickerItem) => void;
  onUpdateStickers: (stickers: StickerItem[]) => void;
  onComplete: (compositeImage: string) => void;
}

const EMOJI_CATALOG = [
  { id: 'emoji_heart', content: '❤️', category: 'emoji' },
  { id: 'emoji_fire', content: '🔥', category: 'emoji' },
  { id: 'emoji_sparkles', content: '✨', category: 'emoji' },
  { id: 'emoji_star', content: '⭐', category: 'emoji' },
  { id: 'emoji_party', content: '🎉', category: 'emoji' },
  { id: 'emoji_love_eyes', content: '😍', category: 'emoji' },
  { id: 'emoji_cool', content: '😎', category: 'emoji' },
  { id: 'emoji_kiss', content: '💋', category: 'emoji' },
  { id: 'emoji_rainbow', content: '🌈', category: 'emoji' },
  { id: 'emoji_camera', content: '📸', category: 'emoji' },
] as const;

const DECO_CATALOG = [
  { id: 'deco_flower', content: '🌸', category: 'decorative' },
  { id: 'deco_cherry', content: '🍒', category: 'decorative' },
  { id: 'deco_ribbon', content: '🎀', category: 'decorative' },
  { id: 'deco_crown', content: '👑', category: 'decorative' },
  { id: 'deco_butterfly', content: '🦋', category: 'decorative' },
  { id: 'deco_diamond', content: '💎', category: 'decorative' },
  { id: 'deco_music', content: '🎵', category: 'decorative' },
  { id: 'deco_confetti', content: '🎊', category: 'decorative' },
] as const;

const TEXT_CATALOG = [
  { id: 'text_love', content: 'LOVE', category: 'text', textColor: '#E91E8C' },
  { id: 'text_bestday', content: 'BEST DAY', category: 'text', textColor: '#00BCD4' },
  { id: 'text_xoxo', content: 'XOXO', category: 'text', textColor: '#E91E8C' },
  { id: 'text_wow', content: 'WOW!', category: 'text', textColor: '#FF9800' },
  { id: 'text_mood', content: '#MOOD', category: 'text', textColor: '#9C27B0' },
] as const;

export default function EditScreen({
  layout,
  selectedPhotos,
  selectedFrame,
  stickers,
  isFrontCamera,
  onAddSticker,
  onUpdateStickers,
  onComplete,
}: EditScreenProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const [compositing, setCompositing] = useState(true);
  const [compositePreview, setCompositePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StickerCategory>('emoji');
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  // Kéo thả và biến đổi sticker state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<'move' | 'transform'>('move');
  const [showDeleteZone, setShowDeleteZone] = useState(false);
  const [stickerInDeleteZone, setStickerInDeleteZone] = useState(false);

  // Lưu trữ thông số chuột/chạm ban đầu khi kéo thả
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    stickerX: number;
    stickerY: number;
    stickerScale: number;
    stickerRotation: number;
    angleStart: number;
    distStart: number;
  }>({
    clientX: 0,
    clientY: 0,
    stickerX: 0.5,
    stickerY: 0.5,
    stickerScale: 1.0,
    stickerRotation: 0,
    angleStart: 0,
    distStart: 1,
  });

  // ── Tạo ảnh ghép nền (chưa có sticker) ──────────────────────────────────────
  useEffect(() => {
    const generatePreview = async () => {
      setCompositing(true);
      try {
        const frameUrl = selectedFrame ? ensureImageUrl(selectedFrame.assetUrl) : null;
        const previewUrl = await PhotoboothCompositor.compositePhotobooth({
          photos: selectedPhotos,
          layout,
          frameOverlayUrl: frameUrl,
          stickers: [], // Không vẽ sticker lên canvas lúc này
          isFrontCamera,
        });
        setCompositePreview(previewUrl);
      } catch (err) {
        console.error('Failed to generate edit screen preview:', err);
      } finally {
        setCompositing(false);
      }
    };
    generatePreview();
  }, [layout, selectedPhotos, selectedFrame, isFrontCamera]);

  // ── Hoàn tất (Composite toàn bộ kể cả sticker chất lượng cao) ───────────────────
  const handleComplete = async () => {
    setCompositing(true);
    try {
      const frameUrl = selectedFrame ? ensureImageUrl(selectedFrame.assetUrl) : null;
      const finalImage = await PhotoboothCompositor.compositePhotobooth({
        photos: selectedPhotos,
        layout,
        frameOverlayUrl: frameUrl,
        stickers, // Vẽ toàn bộ sticker thật
        isFrontCamera,
      });
      onComplete(finalImage);
    } catch (err) {
      console.error('Failed to composite final image:', err);
      alert('Không thể tạo ảnh ghép. Vui lòng thử lại!');
    } finally {
      setCompositing(false);
    }
  };

  // ── Thêm Sticker ────────────────────────────────────────────────────────────
  const addSticker = (catalogItem: typeof EMOJI_CATALOG[number] | typeof DECO_CATALOG[number] | typeof TEXT_CATALOG[number]) => {
    if (stickers.length >= 3) {
      alert('Bạn chỉ được dán tối đa 3 sticker!');
      return;
    }

    const newSticker: StickerItem = {
      id: `${catalogItem.id}_${Date.now()}`,
      content: catalogItem.content,
      category: catalogItem.category,
      position: { x: 0.5, y: 0.4 }, // Đặt gần giữa canvas
      scale: 1.0,
      rotation: 0.0,
      baseFontSize: catalogItem.category === 'text' ? 40 : 64,
      textColor: 'textColor' in catalogItem ? catalogItem.textColor : undefined,
    };

    onAddSticker(newSticker);
    setSelectedStickerId(newSticker.id);
  };

  // ── Xoá sticker ─────────────────────────────────────────────────────────────
  const removeSticker = (id: string) => {
    onUpdateStickers(stickers.filter((s) => s.id !== id));
    if (selectedStickerId === id) setSelectedStickerId(null);
  };

  // ── Hoàn tác sticker cuối cùng ───────────────────────────────────────────────
  const undoLastSticker = () => {
    if (stickers.length > 0) {
      onUpdateStickers(stickers.slice(0, -1));
      setSelectedStickerId(null);
    }
  };

  // ── Xử lý chuột/chạm kéo thả sticker ──────────────────────────────────────────
  const handleStartDrag = (
    e: React.MouseEvent | React.TouchEvent,
    sticker: StickerItem,
    mode: 'move' | 'transform'
  ) => {
    e.stopPropagation();
    setSelectedStickerId(sticker.id);
    setDraggingId(sticker.id);
    setDragMode(mode);
    if (mode === 'move') {
      setShowDeleteZone(true);
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Tính toán góc và khoảng cách từ tâm sticker khi transform (xoay/scale)
    let angleStart = 0;
    let distStart = 1;
    if (mode === 'transform') {
      const stickerPixelX = rect.left + sticker.position.x * rect.width;
      const stickerPixelY = rect.top + sticker.position.y * rect.height;
      const dx = clientX - stickerPixelX;
      const dy = clientY - stickerPixelY;
      angleStart = Math.atan2(dy, dx) - sticker.rotation;
      distStart = Math.sqrt(dx * dx + dy * dy) / sticker.scale;
    }

    dragStartRef.current = {
      clientX,
      clientY,
      stickerX: sticker.position.x,
      stickerY: sticker.position.y,
      stickerScale: sticker.scale,
      stickerRotation: sticker.rotation,
      angleStart,
      distStart,
    };
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!draggingId) return;

    const sticker = stickers.find((s) => s.id === draggingId);
    if (!sticker) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (dragMode === 'move') {
      // 1) Di chuyển vị trí tương đối
      const dx = (clientX - dragStartRef.current.clientX) / rect.width;
      const dy = (clientY - dragStartRef.current.clientY) / rect.height;

      const newX = Math.max(0.05, Math.min(0.95, dragStartRef.current.stickerX + dx));
      const newY = Math.max(0.05, Math.min(0.95, dragStartRef.current.stickerY + dy));

      // Kiểm tra xem có đang nằm trong Delete Zone (đáy canvas, giữa) không
      const isNearDeleteZone = newY > 0.82 && Math.abs(newX - 0.5) < 0.15;
      setStickerInDeleteZone(isNearDeleteZone);

      onUpdateStickers(
        stickers.map((s) => (s.id === draggingId ? { ...s, position: { x: newX, y: newY } } : s))
      );
    } else if (dragMode === 'transform') {
      // 2) Xoay và Scale dựa trên vị trí tâm
      const stickerPixelX = rect.left + sticker.position.x * rect.width;
      const stickerPixelY = rect.top + sticker.position.y * rect.height;

      const dx = clientX - stickerPixelX;
      const dy = clientY - stickerPixelY;

      const newRotation = Math.atan2(dy, dx) - dragStartRef.current.angleStart;
      const newDistance = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.max(0.4, Math.min(3.0, newDistance / dragStartRef.current.distStart));

      onUpdateStickers(
        stickers.map((s) =>
          s.id === draggingId ? { ...s, scale: newScale, rotation: newRotation } : s
        )
      );
    }
  };

  const handleEndDrag = () => {
    if (!draggingId) return;

    if (dragMode === 'move' && stickerInDeleteZone) {
      removeSticker(draggingId);
    }

    setDraggingId(null);
    setShowDeleteZone(false);
    setStickerInDeleteZone(false);
  };

  // Đăng ký event di chuyển chuột toàn cục khi đang drag để mượt mà hơn
  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('mouseup', handleEndDrag);
      window.addEventListener('touchend', handleEndDrag);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchend', handleEndDrag);
    };
  }, [draggingId, dragMode, stickerInDeleteZone, stickers]);

  if (compositing && !compositePreview) {
    return (
      <div className="flex flex-col items-center justify-center flex-1">
        <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
        <p className="text-gray-400 text-sm mt-4">Đang tạo ảnh composite...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto w-full max-w-md mx-auto relative pb-12 px-2 select-none custom-scrollbar">
      {/* ── Toolbar ────────────────────────────────── */}
      <div className="px-6 py-2 flex items-center justify-between shrink-0">
        <span className="text-white text-sm font-bold">Thêm sticker</span>
        {stickers.length > 0 && (
          <button
            onClick={undoLastSticker}
            className="flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 hover:text-white transition-all active:scale-95"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
            Hoàn tác
          </button>
        )}
      </div>

      {/* ── Canvas Area ────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-4 w-full">
        <div
          ref={canvasRef}
          onClick={() => setSelectedStickerId(null)}
          className="relative rounded-3xl overflow-hidden border border-white/10 bg-gray-900 shadow-2xl shadow-black/50 mx-auto"
          style={{
            aspectRatio: '9/16',
            width: '100%',
            maxWidth: 'calc(65vh * 9 / 16)',
            maxHeight: '100%'
          }}
        >
          {compositePreview && (
            <img src={compositePreview} alt="Composite preview" className="w-full h-full object-cover pointer-events-none" />
          )}

          {/* Render draggable stickers overlay */}
          {stickers.map((sticker) => {
            const isSelected = selectedStickerId === sticker.id;
            const x = sticker.position.x * 100;
            const y = sticker.position.y * 100;

            return (
              <div
                key={sticker.id}
                onMouseDown={(e) => handleStartDrag(e, sticker, 'move')}
                onTouchStart={(e) => handleStartDrag(e, sticker, 'move')}
                className={`absolute cursor-move select-none origin-center p-3 transition-shadow duration-100 ${
                  isSelected ? 'z-50' : 'z-40'
                }`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) rotate(${sticker.rotation}rad) scale(${sticker.scale})`,
                }}
              >
                {/* Khung viền khi selected */}
                {isSelected && (
                  <div className="absolute inset-0 border border-pink-500 border-dashed rounded-lg pointer-events-none scale-105" />
                )}

                {/* Sticker content */}
                {sticker.category === 'text' ? (
                  <div
                    className="px-5 py-2.5 rounded-full font-black text-white text-center shadow-lg pointer-events-none tracking-widest whitespace-nowrap"
                    style={{
                      backgroundColor: sticker.textColor || '#E91E8C',
                      fontSize: `${sticker.baseFontSize / 2}px`, // Chia 2 vì vẽ HTML nhỏ hơn canvas gốc
                      textShadow: `0 0 10px ${(sticker.textColor || '#E91E8C')}99`,
                    }}
                  >
                    {sticker.content}
                  </div>
                ) : (
                  <span
                    className="block pointer-events-none select-none"
                    style={{ fontSize: `${sticker.baseFontSize / 2}px` }}
                  >
                    {sticker.content}
                  </span>
                )}

                {/* Nút Transform (Scale/Rotate) góc dưới bên phải */}
                {isSelected && (
                  <button
                    onMouseDown={(e) => handleStartDrag(e, sticker, 'transform')}
                    onTouchStart={(e) => handleStartDrag(e, sticker, 'transform')}
                    className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-pink-500 text-white border-2 border-slate-900 flex items-center justify-center cursor-se-resize active:scale-95 shadow-md shadow-pink-500/20 z-50"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M21 16V8a2 2 0 0 0-2-2h-8M3 20l18-18M3 16v4h4" />
                    </svg>
                  </button>
                )}

                {/* Nút Xoá trực tiếp góc trên bên trái */}
                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSticker(sticker.id);
                    }}
                    className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-slate-800 text-white border-2 border-slate-900 flex items-center justify-center active:scale-95 shadow-md z-50"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}

          {/* Delete zone overlay */}
          {showDeleteZone && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-50">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all duration-150 ${
                  stickerInDeleteZone
                    ? 'bg-red-500 border-white scale-125 shadow-red-500/40 text-white'
                    : 'bg-black/60 border-white/40 text-white/80'
                }`}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticker Panel ───────────────────────────── */}
      <div className="px-6 py-2 shrink-0 bg-[#161B22] border border-white/5 mx-4 rounded-3xl">
        <div className="flex border-b border-white/5 text-center text-xs font-bold">
          <button
            onClick={() => setActiveTab('emoji')}
            className={`flex-1 py-2.5 border-b-2 transition-all ${
              activeTab === 'emoji' ? 'text-pink-500 border-pink-500' : 'text-gray-400 border-transparent'
            }`}
          >
            Emoji
          </button>
          <button
            onClick={() => setActiveTab('decorative')}
            className={`flex-1 py-2.5 border-b-2 transition-all ${
              activeTab === 'decorative' ? 'text-pink-500 border-pink-500' : 'text-gray-400 border-transparent'
            }`}
          >
            Trang trí
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2.5 border-b-2 transition-all ${
              activeTab === 'text' ? 'text-pink-500 border-pink-500' : 'text-gray-400 border-transparent'
            }`}
          >
            Chữ viết
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto py-4 min-h-[72px] items-center">
          {activeTab === 'emoji' &&
            EMOJI_CATALOG.map((item) => (
              <button
                key={item.id}
                onClick={() => addSticker(item)}
                className="text-3xl shrink-0 p-1 hover:scale-110 active:scale-95 transition-transform"
              >
                {item.content}
              </button>
            ))}

          {activeTab === 'decorative' &&
            DECO_CATALOG.map((item) => (
              <button
                key={item.id}
                onClick={() => addSticker(item)}
                className="text-3xl shrink-0 p-1 hover:scale-110 active:scale-95 transition-transform"
              >
                {item.content}
              </button>
            ))}

          {activeTab === 'text' &&
            TEXT_CATALOG.map((item) => (
              <button
                key={item.id}
                onClick={() => addSticker(item)}
                className="px-4 py-2 rounded-full text-white font-black text-xs shrink-0 hover:scale-105 active:scale-95 transition-transform tracking-widest whitespace-nowrap shadow-md"
                style={{
                  backgroundColor: item.textColor,
                  textShadow: `0 0 6px ${item.textColor}cc`,
                }}
              >
                {item.content}
              </button>
            ))}
        </div>
      </div>

      {/* ── Complete button ─────────────────────────── */}
      <div className="px-6 mt-4 shrink-0">
        <button
          onClick={handleComplete}
          disabled={compositing}
          className="w-full py-4 bg-pink-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {compositing ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Hoàn tất
            </>
          )}
        </button>
      </div>
    </div>
  );
}

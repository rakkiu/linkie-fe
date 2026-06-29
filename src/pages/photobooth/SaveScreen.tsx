import { useState } from 'react';
import type { ArFrame } from '../../services/eventService';
import { ensureImageUrl, eventService } from '../../services/eventService';
import { PhotoboothCompositor } from './PhotoboothCompositor';
import type { PhotoboothLayout, StickerItem } from './PhotoboothCompositor';
import RatingModal from '../../components/RatingModal';

interface SaveScreenProps {
  eventId: string;
  eventName: string;
  frames: ArFrame[];
  selectedFrame: ArFrame | null;
  layout: PhotoboothLayout;
  selectedPhotos: string[];
  stickers: StickerItem[];
  isFrontCamera: boolean;
  compositeImage: string; // data URL
  timelapseFrames: string[]; // array of base64 frame image strings
  onRestart: () => void;
}

export default function SaveScreen({
  eventId,
  eventName,
  frames,
  selectedFrame,
  layout,
  selectedPhotos,
  stickers,
  isFrontCamera,
  compositeImage,
  timelapseFrames,
  onRestart,
}: SaveScreenProps) {
  const [currentCompositeImage, setCurrentCompositeImage] = useState(compositeImage);
  const [currentFrame, setCurrentFrame] = useState<ArFrame | null>(selectedFrame);
  const [isRecompositing, setIsRecompositing] = useState(false);

  const [savingPhoto, setSavingPhoto] = useState(false);
  const [savedPhoto, setSavedPhoto] = useState(false);
  const [savingTimelapse, setSavingTimelapse] = useState(false);
  const [savedTimelapse, setSavedTimelapse] = useState(false);
  const [timelapseError, setTimelapseError] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Helper to trigger rating modal
  const triggerRatingCheck = () => {
    setTimeout(async () => {
      try {
        const hasRated = await eventService.checkRatingStatus(eventId);
        if (!hasRated) {
          setShowRatingModal(true);
        }
      } catch (err) {
        setShowRatingModal(true);
      }
    }, 1500);
  };

  // ── Đổi Khung AR trực tiếp ──────────────────────────────────────────────────
  const handleChangeFrame = async (newFrame: ArFrame | null) => {
    if (isRecompositing) return;
    setIsRecompositing(true);

    try {
      const frameUrl = newFrame ? ensureImageUrl(newFrame.assetUrl) : null;
      const regenerated = await PhotoboothCompositor.compositePhotobooth({
        photos: selectedPhotos,
        layout,
        frameOverlayUrl: frameUrl,
        stickers,
        isFrontCamera,
      });

      setCurrentFrame(newFrame);
      setCurrentCompositeImage(regenerated);
      setSavedPhoto(false); // Reset trạng thái tải về khi ảnh đã thay đổi
      setSavedTimelapse(false);
    } catch (err) {
      console.error('Failed to change frame in save screen:', err);
      alert('Lỗi khi thay đổi khung hình!');
    } finally {
      setIsRecompositing(false);
    }
  };

  // ── Tải ảnh JPEG ────────────────────────────────────────────────────────────
  const handleSavePhoto = async () => {
    if (savingPhoto) return;
    setSavingPhoto(true);

    try {
      const link = document.createElement('a');
      const formattedName = eventName.replace(/\s+/g, '-').toLowerCase();
      link.download = `linkie-photobooth-${formattedName}-${Date.now()}.jpg`;
      link.href = currentCompositeImage;
      link.click();

      // Ghi nhận lượt sử dụng khung AR
      if (currentFrame) {
        eventService.recordFrameUsage(eventId, currentFrame.id).catch((err) => {
          console.error('Failed to record frame usage:', err);
        });
      }

      setSavedPhoto(true);
      triggerRatingCheck();
    } catch (err) {
      console.error('Failed to save photo:', err);
      alert('Không thể lưu ảnh.');
    } finally {
      setSavingPhoto(false);
    }
  };

  // ── Tạo & tải Video Time-lapse bằng MediaRecorder từ Canvas ─────────────────
  const handleSaveTimelapse = async () => {
    if (savingTimelapse) return;
    if (timelapseFrames.length === 0) {
      alert('Không có dữ liệu time-lapse!');
      return;
    }

    setSavingTimelapse(true);
    setTimelapseError('');

    try {
      const width = 540;
      const height = 960;

      // 1) Tạo canvas phụ ẩn
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');

      // 2) Thiết lập quay video bằng captureStream
      const fps = 10; // 10 frame một giây
      const stream = canvas.captureStream(fps);

      // Thử định dạng video/mp4 trước (hỗ trợ nhiều trên di động/Safari), sau đó fallback sang video/webm
      const types = [
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];

      let supportedType = '';
      for (const t of types) {
        if (MediaRecorder.isTypeSupported(t)) {
          supportedType = t;
          break;
        }
      }

      if (!supportedType) {
        throw new Error('Trình duyệt của bạn không hỗ trợ ghi hình video.');
      }

      const chunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps cho chất lượng tốt
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const renderFrames = async () => {
        return new Promise<void>(async (resolve) => {
          // Ghi hình bắt đầu
          mediaRecorder.start();

          // Vẽ tuần tự các timelapse frame
          for (let i = 0; i < timelapseFrames.length; i++) {
            const frameUrl = timelapseFrames[i];
            const img = await PhotoboothCompositor.loadImage(frameUrl);
            ctx.drawImage(img, 0, 0, width, height);

            // Đợi 100ms trước khi vẽ frame tiếp theo (10 FPS)
            await new Promise((r) => setTimeout(r, 100));
          }

          // Chờ một chút trước khi kết thúc ghi để nhận đủ buffer cuối
          setTimeout(() => {
            mediaRecorder.stop();
            resolve();
          }, 300);
        });
      };

      mediaRecorder.onstop = () => {
        const extension = supportedType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: supportedType });
        const videoUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        const formattedName = eventName.replace(/\s+/g, '-').toLowerCase();
        link.download = `linkie-timelapse-${formattedName}-${Date.now()}.${extension}`;
        link.href = videoUrl;
        link.click();

        // Giải phóng bộ nhớ
        setTimeout(() => URL.revokeObjectURL(videoUrl), 1000);

        // Ghi nhận lượt tạo Timelapse
        eventService.recordEventAction(eventId, 'timelapse').catch((err) => {
          console.error('Failed to record timelapse action:', err);
        });

        setSavedTimelapse(true);
        setSavingTimelapse(false);
      };

      await renderFrames();
    } catch (err: any) {
      console.error('Failed to generate timelapse:', err);
      setTimelapseError(err.message || 'Lỗi không xác định.');
      setSavingTimelapse(false);
    }
  };

  // ── Chia sẻ (Navigator.share hoặc Copy Link) ────────────────────────────────
  const handleShare = async () => {
    try {
      // 1. Thử chuyển đổi dataURL sang file Blob thực tế để share (nếu trình duyệt hỗ trợ share file)
      const res = await fetch(currentCompositeImage);
      const blob = await res.blob();
      const file = new File([blob], 'linkie-photobooth.jpg', { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Linkie Photobooth',
          text: `Check out my photo from Linkie at ${eventName}! 📸 #LinkiePhotobooth`,
        });
      } else if (navigator.share) {
        // Fallback share link nếu không share được file trực tiếp
        await navigator.share({
          title: 'Linkie Photobooth',
          text: `Check out my photo from Linkie at ${eventName}! 📸 #LinkiePhotobooth`,
          url: window.location.href,
        });
      } else {
        // Trình duyệt PC: Copy URL hiện tại vào clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Đã sao chép liên kết trang sự kiện vào bộ nhớ tạm! Bạn có thể gửi để chia sẻ.');
      }
      
      // Ghi nhận lượt Share thành công
      eventService.recordEventAction(eventId, 'share').catch((err) => {
        console.error('Failed to record share action:', err);
      });
      triggerRatingCheck();
    } catch (err) {
      console.log('User cancelled or browser unsupported share:', err);
    }
  };

  return (
    <div className="flex flex-col flex-1 px-5 py-4 overflow-y-auto max-w-md mx-auto w-full pb-32">
      {/* ── Celebration text ────────────────────────── */}
      {savedPhoto && (
        <div className="text-center mb-2 animate-bounce">
          <span className="text-pink-500 text-lg font-black tracking-tight">
            🎉 Tuyệt vời! Đã tải ảnh xong.
          </span>
        </div>
      )}

      {/* ── Composite Preview ───────────────────────── */}
      <div 
        className="relative mx-auto flex justify-center items-center h-[65vh] max-h-full"
        style={{ aspectRatio: '9/16' }}
      >
        <img
          src={currentCompositeImage}
          alt="Final Photobooth Photo"
          className="h-full object-contain rounded-3xl border border-white/10 shadow-2xl shadow-pink-500/5"
        />

        {isRecompositing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-10 rounded-3xl border border-white/10">
            <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* ── Đổi Khung AR trực tiếp ở dưới ──────────────── */}
      {frames.length > 0 && (
        <div className="mt-6 flex flex-col gap-2 shrink-0">
          <span className="text-xs text-white/90 font-bold uppercase tracking-wider">
            Thay đổi Khung AR nhanh
          </span>
          <div className="flex gap-2.5 overflow-x-auto py-1">
            {/* Tùy chọn Không Khung */}
            <button
              onClick={() => handleChangeFrame(null)}
              className={`w-14 h-18 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all ${
                currentFrame === null
                  ? 'bg-pink-500/10 border-pink-500 text-pink-500'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <span className="text-[7px] font-black uppercase mt-1">Không Khung</span>
            </button>

            {/* Các khung khác */}
            {frames.map((frame) => {
              const isSelected = currentFrame?.id === frame.id;
              const imageUrl = ensureImageUrl(frame.assetUrl);

              return (
                <button
                  key={frame.id}
                  onClick={() => handleChangeFrame(frame)}
                  className={`w-14 h-18 rounded-xl border overflow-hidden p-1 shrink-0 transition-all ${
                    isSelected
                      ? 'bg-pink-500/10 border-pink-500 shadow-md shadow-pink-500/15'
                      : 'bg-white/5 border-white/5 hover:border-white/25'
                  }`}
                >
                  <div className="w-full h-full bg-black/45 rounded-lg flex items-center justify-center p-0.5">
                    <img src={imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Buttons Grid ────────────────────────────── */}
      <div className="mt-8 grid grid-cols-2 gap-3 shrink-0">
        {/* Lưu Ảnh */}
        <button
          onClick={handleSavePhoto}
          className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-all active:scale-95 ${
            savedPhoto
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
              : 'bg-pink-500/10 border-pink-500/20 text-pink-500 hover:bg-pink-500/15'
          }`}
        >
          {savingPhoto ? (
            <div className="animate-spin w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full" />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              {savedPhoto ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </>
              )}
            </svg>
          )}
          <span className="text-[11px] font-black uppercase tracking-wider">
            {savedPhoto ? 'Đã lưu!' : 'Lưu Ảnh'}
          </span>
        </button>

        {/* Time-lapse */}
        <button
          onClick={handleSaveTimelapse}
          disabled={timelapseFrames.length === 0}
          className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
            savedTimelapse
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
              : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500 hover:bg-cyan-500/15'
          }`}
        >
          {savingTimelapse ? (
            <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full" />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              {savedTimelapse ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                  <line x1="7" y1="2" x2="7" y2="22" />
                  <line x1="17" y1="2" x2="17" y2="22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <line x1="2" y1="7" x2="7" y2="7" />
                  <line x1="2" y1="17" x2="7" y2="17" />
                  <line x1="17" y1="17" x2="22" y2="17" />
                  <line x1="17" y1="7" x2="22" y2="7" />
                </>
              )}
            </svg>
          )}
          <span className="text-[11px] font-black uppercase tracking-wider">
            {savedTimelapse ? 'Đã tạo!' : 'Time-lapse'}
          </span>
          {timelapseError && <span className="text-[7px] text-red-500 font-medium px-2">{timelapseError}</span>}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 shrink-0">
        {/* Chia sẻ */}
        <button
          onClick={handleShare}
          className="py-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500 hover:bg-purple-500/15 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span className="text-[11px] font-black uppercase tracking-wider">Chia sẻ</span>
        </button>

        {/* Chụp lại */}
        <button
          onClick={onRestart}
          className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span className="text-[11px] font-black uppercase tracking-wider">Chụp lại</span>
        </button>
      </div>

      {showRatingModal && eventId && (
        <RatingModal 
          eventId={eventId} 
          onSuccess={() => setShowRatingModal(false)} 
        />
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { PHOTOBOOTH_LAYOUT_META } from './PhotoboothCompositor';
import type { PhotoboothLayout } from './PhotoboothCompositor';

interface CaptureScreenProps {
  layout: PhotoboothLayout;
  capturedPhotos: string[];
  requiredCount: number;
  isFrontCamera: boolean;
  zoomLevel: number;
  onAddPhoto: (photoDataUrl: string) => void;
  onAddTimelapseFrame: (frameDataUrl: string) => void;
  onToggleFrontCamera: (isFront: boolean) => void;
  onZoomChange: (zoom: number) => void;
  onComplete: () => void;
}

export default function CaptureScreen({
  layout,
  capturedPhotos,
  requiredCount,
  isFrontCamera,
  zoomLevel,
  onAddPhoto,
  onAddTimelapseFrame,
  onToggleFrontCamera,
  onZoomChange,
  onComplete,
}: CaptureScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timelapseTimerRef = useRef<number | null>(null);
  const autoCaptureTimerRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [flashVisible, setFlashVisible] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [autoCapture, setAutoCapture] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // ── Khởi động Camera ────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setLoading(true);
    setCameraError('');

    // Dừng stream cũ nếu có
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Đợi video metadata load
        videoRef.current.onloadedmetadata = () => {
          setLoading(false);
        };
        // Kích hoạt play để đảm bảo metadata được load trên một số trình duyệt
        videoRef.current.play().catch((playErr) => {
          console.warn('Video play integration error:', playErr);
        });
      }
    } catch (err) {
      console.error('Camera capture error:', err);
      setCameraError('Không thể truy cập camera. Vui lòng cấp quyền camera.');
      setLoading(false);
    }
  }, [isFrontCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timelapseTimerRef.current) {
        window.clearInterval(timelapseTimerRef.current);
      }
      if (autoCaptureTimerRef.current) {
        window.clearTimeout(autoCaptureTimerRef.current);
      }
    };
  }, [startCamera]);

  // ── Ghi Timelapse (Mỗi 1.5s lấy một frame nhỏ 540x960) ──────────────────────
  const recordTimelapseFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended || isCapturing || countdown !== null) return;

    const canvas = document.createElement('canvas');
    canvas.width = 540;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vW = video.videoWidth;
    const vH = video.videoHeight;
    if (!vW || !vH) return;

    // Tính toán cắt center-fit 9:16 từ video feed
    const targetAspect = 9 / 16;
    let sW = vW;
    let sH = vH;
    let sx = 0;
    let sy = 0;

    const currentAspect = vW / vH;
    if (currentAspect > targetAspect) {
      sW = vH * targetAspect;
      sx = (vW - sW) / 2;
    } else {
      sH = vW / targetAspect;
      sy = (vH - sH) / 2;
    }

    // Áp dụng zoom giả lập phần mềm cho timelapse
    const clipW = sW / zoomLevel;
    const clipH = sH / zoomLevel;
    const clipX = sx + (sW - clipW) / 2;
    const clipY = sy + (sH - clipH) / 2;

    if (isFrontCamera) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, clipX, clipY, clipW, clipH, 0, 0, canvas.width, canvas.height);
    onAddTimelapseFrame(canvas.toDataURL('image/jpeg', 0.6));
  }, [isCapturing, countdown, isFrontCamera, zoomLevel, onAddTimelapseFrame]);

  useEffect(() => {
    if (loading || cameraError) return;

    timelapseTimerRef.current = window.setInterval(() => {
      recordTimelapseFrame();
    }, 1500);

    return () => {
      if (timelapseTimerRef.current) {
        window.clearInterval(timelapseTimerRef.current);
        timelapseTimerRef.current = null;
      }
    };
  }, [loading, cameraError, recordTimelapseFrame]);

  // ── Chụp ảnh chính ──────────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || isCapturing) return;

    setIsCapturing(true);
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 150);

    const vW = video.videoWidth || 1280;
    const vH = video.videoHeight || 720;

    // Chụp chất lượng cao: 1080x1920
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    const targetAspect = 9 / 16;
    let sW = vW;
    let sH = vH;
    let sx = 0;
    let sy = 0;

    const currentAspect = vW / vH;
    if (currentAspect > targetAspect) {
      sW = vH * targetAspect;
      sx = (vW - sW) / 2;
    } else {
      sH = vW / targetAspect;
      sy = (vH - sH) / 2;
    }

    // Áp dụng software zoom
    const clipW = sW / zoomLevel;
    const clipH = sH / zoomLevel;
    const clipX = sx + (sW - clipW) / 2;
    const clipY = sy + (sH - clipH) / 2;

    ctx.drawImage(video, clipX, clipY, clipW, clipH, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onAddPhoto(photoDataUrl);

    setIsCapturing(false);
  }, [isCapturing, zoomLevel, onAddPhoto]);

  // ── Xử lý đếm ngược (Countdown) ─────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    if (isCapturing || countdown !== null) return;
    setCountdown(3);
  }, [isCapturing, countdown]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      setCountdown(null);
      capturePhoto();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, capturePhoto]);

  // ── Tự động chụp (Auto Capture) tiếp theo ──────────────────────────────────
  useEffect(() => {
    // Nếu ảnh chụp đã đủ số lượng yêu cầu
    if (capturedPhotos.length >= requiredCount) {
      if (autoCaptureTimerRef.current) {
        window.clearTimeout(autoCaptureTimerRef.current);
      }
      onComplete();
      return;
    }

    // Nếu đang ở chế độ tự động chụp, và vừa chụp xong 1 tấm (và chưa đủ số lượng)
    if (autoCapture && capturedPhotos.length > 0 && !isCapturing && countdown === null) {
      autoCaptureTimerRef.current = window.setTimeout(() => {
        startCountdown();
      }, 3000); // 3 giây chuẩn bị cho lần chụp tiếp theo
    }

    return () => {
      if (autoCaptureTimerRef.current) {
        window.clearTimeout(autoCaptureTimerRef.current);
      }
    };
  }, [capturedPhotos.length, requiredCount, autoCapture, isCapturing, countdown, startCountdown, onComplete]);

  // ── Đổi camera ──────────────────────────────────────────────────────────────
  const toggleCamera = () => {
    onToggleFrontCamera(!isFrontCamera);
  };

  // ── Zoom control slider ─────────────────────────────────────────────────────
  const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    onZoomChange(parseFloat(e.target.value));
  };

  const meta = PHOTOBOOTH_LAYOUT_META[layout];

  return (
    <div className="flex flex-col flex-1 overflow-hidden w-full max-w-md mx-auto relative pb-6">
      {/* ── Màn hình Loading overlay ────────────────── */}
      {loading && (
        <div className="absolute inset-0 bg-[#0d1117] z-50 flex flex-col items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full" />
          <p className="text-gray-400 text-sm mt-4">Đang khởi động Camera...</p>
        </div>
      )}

      {/* ── Màn hình Lỗi overlay ────────────────── */}
      {!loading && cameraError && (
        <div className="absolute inset-0 bg-[#0d1117] z-50 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
          <p className="text-red-400 font-medium mb-4">{cameraError}</p>
          <button
            onClick={startCamera}
            className="text-xs bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-colors text-white"
          >
            Thử lại
          </button>
        </div>
      )}
      {/* ── Photo progress bar ─────────────────────── */}
      <div className="px-6 py-2 flex items-center justify-center gap-1.5 shrink-0">
        {Array.from({ length: requiredCount }).map((_, i) => {
          const isDone = i < capturedPhotos.length;
          const isCurrent = i === capturedPhotos.length;
          return (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                isDone
                  ? 'bg-pink-500 shadow-md shadow-pink-500/30'
                  : isCurrent
                  ? 'bg-pink-500/50 animate-pulse'
                  : 'bg-white/10'
              }`}
            />
          );
        })}
      </div>

      {/* ── Viewfinder ─────────────────────────────── */}
      <div className="flex-1 mx-4 mt-2 rounded-3xl overflow-hidden bg-black relative border border-white/5 shadow-2xl shadow-pink-500/5 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transition-transform duration-100"
          style={{
            transform: `${isFrontCamera ? 'scaleX(-1)' : 'scaleX(1)'} scale(${zoomLevel})`,
          }}
        />

        {/* Flash effect overlay */}
        {flashVisible && (
          <div className="absolute inset-0 bg-white z-20 transition-opacity duration-150 opacity-90" />
        )}

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs z-30 select-none">
            <span className="text-white text-8xl font-black tracking-tighter animate-ping">
              {countdown}
            </span>
          </div>
        )}

        {/* Layout label (top left) */}
        <div className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full pointer-events-none">
          <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest">
            {meta.label}
          </span>
        </div>

        {/* Timelapse Recording indicator (top right) */}
        <div className="absolute top-4 right-4 z-10 bg-red-500/80 backdrop-blur-md px-3 py-1 rounded-full pointer-events-none flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          <span className="text-[9px] text-white font-bold tracking-widest">REC</span>
        </div>

        {/* Software Zoom Slider (bottom center) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3 w-4/5 max-w-[280px]">
          <span className="text-[9px] font-bold text-white/60">1x</span>
          <input
            type="range"
            min="1.0"
            max="3.0"
            step="0.1"
            value={zoomLevel}
            onChange={handleZoomSlider}
            className="flex-1 accent-pink-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[9px] font-bold text-pink-400 w-6 text-right">
            {zoomLevel.toFixed(1)}x
          </span>
        </div>
      </div>

      {/* ── Nút điều khiển ──────────────────────────── */}
      <div className="px-6 pt-5 pb-2 shrink-0 flex items-center justify-between gap-4">
        {/* Left: Tự động chụp */}
        <button
          onClick={() => {
            setAutoCapture(!autoCapture);
            if (!autoCapture && capturedPhotos.length < requiredCount) {
              startCountdown();
            }
          }}
          className={`w-14 h-14 rounded-full border flex flex-col items-center justify-center active:scale-95 transition-all ${
            autoCapture
              ? 'bg-pink-500/20 border-pink-500 text-pink-500'
              : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="mb-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-[7px] font-black uppercase tracking-wider">Tự động</span>
        </button>

        {/* Center: Chụp ảnh */}
        <button
          onClick={startCountdown}
          disabled={countdown !== null || isCapturing}
          className="active:scale-95 transition-transform disabled:opacity-30 disabled:scale-100 relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-pink-500 rounded-full blur-md opacity-25 group-hover:opacity-40 animate-pulse transition-opacity" />
          <div className="w-18 h-18 rounded-full border-4 border-pink-500 bg-[#0d1117] flex items-center justify-center p-1 relative z-10">
            <div className="w-full h-full rounded-full bg-pink-500/10 flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-white"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
        </button>

        {/* Right: Đổi camera */}
        <button
          onClick={toggleCamera}
          className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center active:scale-95 transition-all text-white/60 hover:text-white"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mb-0.5"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span className="text-[7px] font-black uppercase tracking-wider">Đổi cam</span>
        </button>
      </div>
    </div>
  );
}

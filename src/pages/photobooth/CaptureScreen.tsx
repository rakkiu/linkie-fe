import { useEffect, useRef, useState, useCallback } from 'react';
import { PHOTOBOOTH_LAYOUT_META } from './PhotoboothCompositor';
import type { PhotoboothLayout } from './PhotoboothCompositor';

import { PhotoboothCompositor } from './PhotoboothCompositor';

// ── Tỉ lệ ô strip1x2 trong canvas 1080×1920 theo chuẩn mới có Header/Footer
// Cell: 968 × 367 → ratio ≈ 2.637
const STRIP_CELL_W = PhotoboothCompositor.canvasWidth - PhotoboothCompositor.paddingSide * 2;
const STRIP_CELL_H = (PhotoboothCompositor.canvasHeight - PhotoboothCompositor.paddingTop - PhotoboothCompositor.paddingBottom - PhotoboothCompositor.gap * 1) / 2;
const STRIP_CELL_RATIO = STRIP_CELL_W / STRIP_CELL_H;

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
  const isStrip = layout === 'strip1x2';

  // ── Refs ────────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);       // Standard viewfinder
  const stripPreviewRef = useRef<HTMLVideoElement>(null); // Strip active-slot preview
  const streamRef = useRef<MediaStream | null>(null);
  const timelapseTimerRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const viewfinderRef = useRef<HTMLDivElement>(null);
  const zoomLevelRef = useRef(zoomLevel);

  // Stable refs để tránh stale closure trong timer
  const capturePhotoRef = useRef<() => void>(() => {});
  const recordTimelapseFrameRef = useRef<() => void>(() => {});
  const startCountdownRef = useRef<() => void>(() => {});

  useEffect(() => { zoomLevelRef.current = zoomLevel; }, [zoomLevel]);

  // ── Shared state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [flashVisible, setFlashVisible] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(3);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false); // thay thế autoCapture

  // ── Strip-only state ────────────────────────────────────────────────────────
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [slotPhotos, setSlotPhotos] = useState<(string | null)[]>(Array(2).fill(null));

  // ── Khởi động Camera ────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setLoading(true);
    setCameraError('');
    setFlashEnabled(false);
    setHasTorch(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;

      try {
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const caps = track.getCapabilities() as any;
          setHasTorch(!!caps.torch);
        }
      } catch { setHasTorch(false); }

      // Standard mode: gán vào videoRef
      if (!isStrip && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setLoading(false);
        videoRef.current.play().catch(err => console.warn('Video play error:', err));
      } else {
        // Strip mode: loading false ngay, srcObject gán trong useEffect
        setLoading(false);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Không thể truy cập camera. Vui lòng cấp quyền camera.');
      setLoading(false);
    }
  }, [isFrontCamera, isStrip]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timelapseTimerRef.current) clearInterval(timelapseTimerRef.current);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [startCamera]);

  // ── Strip: gán stream vào preview video khi slot thay đổi ──────────────────
  useEffect(() => {
    if (!isStrip || loading || !streamRef.current) return;
    const el = stripPreviewRef.current;
    if (el && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, [isStrip, loading, activeSlotIndex]);

  // ── Lấy video element đang active (để capture/timelapse) ───────────────────
  const getActiveVideo = useCallback(() => {
    return isStrip ? stripPreviewRef.current : videoRef.current;
  }, [isStrip]);

  // ── Timelapse (ghi 200ms/frame theo 9:16) ───────────────────────────────────
  const recordTimelapseFrame = useCallback(() => {
    const video = getActiveVideo();
    if (!video || video.paused || video.ended) return;

    const canvas = document.createElement('canvas');
    canvas.width = 540;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vW = video.videoWidth;
    const vH = video.videoHeight;
    if (!vW || !vH) return;

    const targetAspect = 9 / 16;
    let sW = vW, sH = vH, sx = 0, sy = 0;
    const currentAspect = vW / vH;
    if (currentAspect > targetAspect) { sW = vH * targetAspect; sx = (vW - sW) / 2; }
    else { sH = vW / targetAspect; sy = (vH - sH) / 2; }

    if (isFrontCamera) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }

    const az = Math.max(1.0, zoomLevel);
    ctx.drawImage(video, sx + (sW - sW / az) / 2, sy + (sH - sH / az) / 2, sW / az, sH / az, 0, 0, canvas.width, canvas.height);
    onAddTimelapseFrame(canvas.toDataURL('image/jpeg', 0.6));
  }, [getActiveVideo, isFrontCamera, zoomLevel, onAddTimelapseFrame]);

  useEffect(() => {
    capturePhotoRef.current = capturePhoto;
    recordTimelapseFrameRef.current = recordTimelapseFrame;
    startCountdownRef.current = startCountdown;
  });

  useEffect(() => {
    if (loading || cameraError) return;
    timelapseTimerRef.current = window.setInterval(() => {
      recordTimelapseFrameRef.current();
    }, 200);
    return () => {
      if (timelapseTimerRef.current) { clearInterval(timelapseTimerRef.current); timelapseTimerRef.current = null; }
    };
  }, [loading, cameraError]);

  // ── Chụp ảnh ────────────────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video = getActiveVideo();
    if (!video || isCapturing) return;

    setIsCapturing(true);
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 150);

    const vW = video.videoWidth || 1280;
    const vH = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    let targetAspect: number;

    if (isStrip) {
      // Chụp đúng tỉ lệ ô strip (2.278:1 landscape) → ảnh fit hoàn hảo vào cell
      targetAspect = STRIP_CELL_RATIO;
      canvas.width = 1920;
      canvas.height = Math.round(1920 / STRIP_CELL_RATIO); // ≈ 843
    } else {
      targetAspect = 9 / 16;
      canvas.width = 1080;
      canvas.height = 1920;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) { setIsCapturing(false); return; }

    let sW = vW, sH = vH, sx = 0, sy = 0;
    const currentAspect = vW / vH;
    if (currentAspect > targetAspect) { sW = vH * targetAspect; sx = (vW - sW) / 2; }
    else { sH = vW / targetAspect; sy = (vH - sH) / 2; }

    const az = Math.max(1.0, zoomLevel);
    const clipW = sW / az, clipH = sH / az;
    const clipX = sx + (sW - clipW) / 2, clipY = sy + (sH - clipH) / 2;

    if (isFrontCamera) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, clipX, clipY, clipW, clipH, 0, 0, canvas.width, canvas.height);

    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    if (isStrip) {
      setSlotPhotos(prev => {
        const next = [...prev];
        next[activeSlotIndex] = photoDataUrl;
        return next;
      });
    } else {
      onAddPhoto(photoDataUrl);
    }

    setIsCapturing(false);
  }, [getActiveVideo, isCapturing, zoomLevel, isFrontCamera, isStrip, activeSlotIndex, onAddPhoto]);

  // Lắng nghe sự thay đổi của slotPhotos (Strip mode) để điều phối luồng chụp
  useEffect(() => {
    if (!isStrip) return;
    const doneCount = slotPhotos.filter(p => p !== null).length;
    let localTimer: number | null = null;
    
    if (doneCount === 2 && !completedRef.current) {
      completedRef.current = true;
      localTimer = window.setTimeout(() => {
        slotPhotos.forEach(p => { if (p) onAddPhoto(p); });
        onComplete();
      }, 1000);
    } else if (doneCount > 0 && doneCount < 2 && !completedRef.current) {
      // Tìm slot kế tiếp chưa có ảnh
      const nextEmpty = slotPhotos.findIndex(p => p === null);
      if (nextEmpty !== -1 && activeSlotIndex !== nextEmpty) {
        localTimer = window.setTimeout(() => {
          setActiveSlotIndex(nextEmpty);
        }, 1000);
      }
    }

    return () => {
      if (localTimer) window.clearTimeout(localTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotPhotos, isStrip, activeSlotIndex]);

  // Standard mode: auto-complete khi đủ ảnh
  useEffect(() => {
    if (!isStrip && capturedPhotos.length >= requiredCount) {
      onComplete();
    }
  }, [capturedPhotos.length, requiredCount, isStrip, onComplete]);

  // ── Countdown ───────────────────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    if (isCapturing || countdown !== null) return;
    if (timerEnabled) {
      setCountdown(countdownDuration);
    } else {
      capturePhotoRef.current();
    }
  }, [isCapturing, countdown, timerEnabled, countdownDuration]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { setCountdown(null); capturePhotoRef.current(); return; }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Camera controls ─────────────────────────────────────────────────────────
  const toggleCamera = () => onToggleFrontCamera(!isFrontCamera);

  const toggleFlash = async () => {
    const next = !flashEnabled;
    setFlashEnabled(next);
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === 'function') {
      try { await track.applyConstraints({ advanced: [{ torch: next } as any] }); }
      catch (err) { console.warn('Torch error:', err); }
    }
  };

  // ── Pinch / drag zoom (Standard viewfinder) ─────────────────────────────────
  useEffect(() => {
    const el = viewfinderRef.current;
    if (!el || isStrip) return;

    let isPinching = false, startDist = 0, startZoom = 1.0;
    let isDragging = false, startY = 0, dragStartZoom = 1.0;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('button') || t.closest('input')) return;
      if (e.touches.length === 2) {
        isPinching = true; isDragging = false; e.preventDefault();
        startDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        startZoom = zoomLevelRef.current;
      } else if (e.touches.length === 1) {
        isDragging = true; isPinching = false;
        startY = e.touches[0].clientY; dragStartZoom = zoomLevelRef.current;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinching) {
        e.preventDefault();
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (startDist > 0) onZoomChange(parseFloat(Math.max(1.0, Math.min(3.0, startZoom * (dist / startDist))).toFixed(2)));
      } else if (e.touches.length === 1 && isDragging) {
        e.preventDefault();
        onZoomChange(parseFloat(Math.max(1.0, Math.min(3.0, dragStartZoom + (startY - e.touches[0].clientY) / 180)).toFixed(2)));
      }
    };
    const onTouchEnd = () => { isPinching = false; isDragging = false; startDist = 0; };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isStrip, onZoomChange]);

  const meta = PHOTOBOOTH_LAYOUT_META[layout];

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full" />
        <p className="text-gray-400 text-sm mt-4">Đang khởi động Camera...</p>
      </div>
    );
  }

  if (cameraError) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-8 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" /><line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </div>
        <p className="text-red-400 font-medium mb-4">{cameraError}</p>
        <button onClick={startCamera} className="text-xs bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 text-white">
          Thử lại
        </button>
      </div>
    );
  }

  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║  STRIP 1×2 — Multi-slot Camera View                                     ║
  // ╚═══════════════════════════════════════════════════════════════════════════╝
  if (isStrip) {
    const doneCount = slotPhotos.filter(p => p !== null).length;

    return (
      <div className="flex flex-col flex-1 overflow-hidden w-full max-w-md mx-auto relative pb-4">

        {/* Flash overlay */}
        {flashVisible && <div className="absolute inset-0 bg-white z-50 opacity-90 pointer-events-none" />}

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-40 pointer-events-none">
            <span className="text-white text-9xl font-black animate-ping select-none">{countdown}</span>
          </div>
        )}

        {/* Progress dots */}
        <div className="px-4 py-2 shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-pink-400 font-black uppercase tracking-widest">
            Tấm {Math.min(doneCount + 1, 2)} / 2
          </span>
          <div className="flex gap-1.5">
            {slotPhotos.map((p, i) => (
              <div key={i} className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                p !== null ? 'bg-pink-500 shadow-md shadow-pink-500/30'
                  : i === activeSlotIndex ? 'bg-pink-500/50 animate-pulse'
                  : 'bg-white/10'
              }`} />
            ))}
          </div>
        </div>

        {/* 2 Slots */}
        <div className="flex-1 px-3 flex flex-col gap-2 overflow-hidden min-h-0">
          {slotPhotos.map((photo, idx) => {
            const isActive = idx === activeSlotIndex;
            const isDone = photo !== null;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
                  setActiveSlotIndex(idx);
                }}
                className={`relative flex-1 rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 min-h-0 ${
                  isActive
                    ? 'border-pink-500 shadow-lg shadow-pink-500/25'
                    : isDone
                    ? 'border-white/20'
                    : 'border-white/5'
                }`}
              >
                {/* Live camera: ô đang active */}
                {isActive && (
                  <>
                    <video
                      ref={stripPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ transform: isFrontCamera ? 'scaleX(-1)' : 'scaleX(1)' }}
                    />
                    {/* LIVE badge */}
                    <div className="absolute top-1.5 left-1.5 z-10 bg-red-500/80 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 pointer-events-none">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      <span className="text-[8px] text-white font-bold tracking-widest">LIVE</span>
                    </div>
                    {/* Slot number */}
                    <div className="absolute top-1.5 right-1.5 z-10 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full pointer-events-none">
                      <span className="text-[8px] text-pink-400 font-black">#{idx + 1}</span>
                    </div>
                  </>
                )}

                {/* Ảnh đã chụp (ô không active) */}
                {isDone && !isActive && (
                  <>
                    <img src={photo!} alt={`Slot ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                    {/* Done badge */}
                    <div className="absolute top-1.5 left-1.5 z-10 bg-pink-500/80 backdrop-blur-md px-2 py-0.5 rounded-full pointer-events-none">
                      <span className="text-[8px] text-white font-black">✓ {idx + 1}</span>
                    </div>
                    {/* Retry button — góc trên phải */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
                        completedRef.current = false;
                        setSlotPhotos(prev => {
                          const next = [...prev];
                          next[idx] = null;
                          return next;
                        });
                        setActiveSlotIndex(idx);
                      }}
                      className="absolute top-1.5 right-1.5 z-20 w-7 h-7 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 hover:bg-red-500/30 hover:border-red-400 transition-all active:scale-90"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Placeholder chưa chụp */}
                {!isDone && !isActive && (
                  <div className="absolute inset-0 bg-white/3 flex items-center justify-center">
                    <span className="text-white/15 text-3xl font-black select-none">{idx + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="px-4 pt-2 shrink-0">
          {/* Timer toggle */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <button
              onClick={() => setTimerEnabled(!timerEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all ${
                timerEnabled
                  ? 'bg-pink-500/20 border-pink-500 text-pink-500'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
              }`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              Hẹn giờ
            </button>
            {timerEnabled && (
              <div className="flex bg-white/5 border border-white/10 rounded-full p-0.5 gap-0.5">
                {[3, 5, 10, 15].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setCountdownDuration(sec)}
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                      countdownDuration === sec ? 'bg-pink-500 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Shutter row */}
          <div className="grid grid-cols-3 items-center w-full pt-1">
            {/* Zoom presets */}
            <div className="flex justify-start">
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/10">
                {[1.0, 2.0].map(preset => {
                  const active = Math.abs(zoomLevel - preset) < 0.05;
                  return (
                    <button
                      key={preset}
                      onClick={() => onZoomChange(preset)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black transition-all active:scale-90 ${
                        active ? 'bg-pink-500 text-white' : 'bg-black/30 text-white/60'
                      }`}
                    >
                      {preset === 1.0 ? '1x' : '2x'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shutter */}
            <div className="flex justify-center">
              <button
                onClick={startCountdown}
                disabled={countdown !== null || isCapturing}
                className="active:scale-95 transition-transform disabled:opacity-30 disabled:scale-100 relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-pink-500 rounded-full blur-md opacity-25 group-hover:opacity-40 animate-pulse transition-opacity" />
                <div className="w-16 h-16 rounded-full border-4 border-pink-500 bg-[#0d1117] flex items-center justify-center p-1 relative z-10">
                  <div className="w-full h-full rounded-full bg-pink-500/10 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>

            {/* Camera switch + Flash */}
            <div className="flex justify-end gap-2">
              {!isFrontCamera && hasTorch && (
                <button
                  onClick={toggleFlash}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                    flashEnabled ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-black/40 border-white/10 text-white/60'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={flashEnabled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </button>
              )}
              <button
                onClick={toggleCamera}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-all text-white/60 hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ╔═══════════════════════════════════════════════════════════════════════════╗
  // ║  STANDARD VIEW — grid2x2 / grid2x4 (giữ nguyên UX cũ)                  ║
  // ╚═══════════════════════════════════════════════════════════════════════════╝
  return (
    <div className="flex flex-col flex-1 overflow-hidden w-full max-w-md mx-auto relative pb-6">

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-[#0d1117] z-50 flex flex-col items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full" />
          <p className="text-gray-400 text-sm mt-4">Đang khởi động Camera...</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="px-6 py-2 flex items-center justify-center gap-1.5 shrink-0">
        {Array.from({ length: requiredCount }).map((_, i) => {
          const isDone = i < capturedPhotos.length;
          const isCurrent = i === capturedPhotos.length;
          return (
            <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              isDone ? 'bg-pink-500 shadow-md shadow-pink-500/30' : isCurrent ? 'bg-pink-500/50 animate-pulse' : 'bg-white/10'
            }`} />
          );
        })}
      </div>

      {/* Viewfinder */}
      <div
        ref={viewfinderRef}
        className="flex-1 mx-4 mt-2 rounded-3xl overflow-hidden bg-black relative border border-white/5 shadow-2xl shadow-pink-500/5 flex items-center justify-center select-none touch-none"
      >
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-100"
          style={{ transform: `${isFrontCamera ? 'scaleX(-1)' : 'scaleX(1)'} scale(${Math.max(1.0, zoomLevel)})` }}
        />

        {flashVisible && <div className="absolute inset-0 bg-white z-20 opacity-90" />}

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs z-30">
            <span className="text-white text-8xl font-black tracking-tighter animate-ping">{countdown}</span>
          </div>
        )}

        {/* Layout label */}
        <div className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full pointer-events-none">
          <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest">{meta.label}</span>
        </div>

        {/* Flash button */}
        {!isFrontCamera && hasTorch && (
          <button
            onClick={toggleFlash}
            className={`absolute top-14 left-4 z-30 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-90 ${
              flashEnabled ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={flashEnabled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </button>
        )}

        {/* REC badge */}
        <div className="absolute top-4 right-4 z-10 bg-red-500/80 backdrop-blur-md px-3 py-1 rounded-full pointer-events-none flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          <span className="text-[9px] text-white font-bold tracking-widest">REC</span>
        </div>

        {/* Photo counter */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full pointer-events-none">
          <span className="text-[9px] text-pink-400 font-extrabold uppercase tracking-widest whitespace-nowrap">
            Tấm {Math.min(capturedPhotos.length + 1, requiredCount)} / {requiredCount}
          </span>
        </div>

        {/* Zoom presets */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 select-none pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[9px] font-extrabold text-pink-400 tracking-wider">
            {zoomLevel.toFixed(1)}x
          </div>
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 shadow-lg">
            {[1.0, 2.0].map(preset => {
              const active = Math.abs(zoomLevel - preset) < 0.05;
              return (
                <button
                  key={preset}
                  onClick={e => { e.stopPropagation(); onZoomChange(preset); }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all active:scale-90 ${
                    active ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30' : 'bg-black/30 text-white/70 hover:text-white border border-white/5'
                  }`}
                >
                  {preset === 1.0 ? '1x' : '2x'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timer toggle */}
      <div className="px-6 pt-3 pb-0 shrink-0 flex items-center justify-center gap-3">
        <button
          onClick={() => setTimerEnabled(!timerEnabled)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all ${
            timerEnabled ? 'bg-pink-500/20 border-pink-500 text-pink-500' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          Hẹn giờ
        </button>
        {timerEnabled && (
          <div className="flex bg-white/5 border border-white/10 rounded-full p-0.5 gap-0.5">
            {[3, 5, 10, 15].map(sec => (
              <button
                key={sec}
                onClick={() => setCountdownDuration(sec)}
                className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${
                  countdownDuration === sec ? 'bg-pink-500 text-white shadow-md shadow-pink-500/25' : 'text-white/60 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Capture controls */}
      <div className="px-6 pt-2 pb-4 shrink-0 grid grid-cols-3 items-center w-full">
        {/* Spacer để cân bằng layout */}
        <div className="flex justify-start"></div>

        {/* Shutter */}
        <div className="flex justify-center">
          <button
            onClick={startCountdown}
            disabled={countdown !== null || isCapturing}
            className="active:scale-95 transition-transform disabled:opacity-30 disabled:scale-100 relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-pink-500 rounded-full blur-md opacity-25 group-hover:opacity-40 animate-pulse transition-opacity" />
            <div className="w-18 h-18 rounded-full border-4 border-pink-500 bg-[#0d1117] flex items-center justify-center p-1 relative z-10">
              <div className="w-full h-full rounded-full bg-pink-500/10 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Camera switch */}
        <div className="flex justify-end">
          <button
            onClick={toggleCamera}
            className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center active:scale-95 transition-all text-white/60 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-0.5">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span className="text-[7px] font-black uppercase tracking-wider">Đổi cam</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

const eventNames: Record<number, string> = {
  1: 'Nights Festival',
  2: 'Fireworks Festival',
};

// ── Frame definitions ──────────────────────────────────────────────────────────
// Each frame is an SVG overlay composited on top of the camera feed.
// Colors/styles mimic the coloured border frames visible in the screenshot.
const FRAMES = [
  {
    id: 1,
    label: 'Neon Pink',
    thumb: 'linear-gradient(135deg,#ff4ecd,#7c3aed)',
    render: (w: number, h: number) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <defs>
          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff4ecd"/>
            <stop offset="100%" stop-color="#7c3aed"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="url(#g1)" stroke-width="18" rx="16"/>
        <text x="${w / 2}" y="${h - 12}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#ff4ecd">Li-Fst</text>
        <circle cx="38" cy="${h - 38}" r="20" fill="#ff4ecd" opacity="0.85"/>
        <text x="38" y="${h - 32}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="white">LK</text>
      </svg>`,
  },
  {
    id: 2,
    label: 'Cyber Blue',
    thumb: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
    render: (w: number, h: number) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <defs>
          <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0ea5e9"/>
            <stop offset="100%" stop-color="#6366f1"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="url(#g2)" stroke-width="18" rx="16"/>
        <rect x="10" y="10" width="${w - 20}" height="${h - 20}" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-dasharray="8 4" rx="10" opacity="0.5"/>
        <text x="${w / 2}" y="${h - 12}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#0ea5e9">Li-Fst</text>
      </svg>`,
  },
  {
    id: 3,
    label: 'Linkie White',
    thumb: 'linear-gradient(135deg,#e0e7ff,#a5b4fc)',
    render: (w: number, h: number) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="white" stroke-width="18" rx="16"/>
        <rect x="10" y="10" width="${w - 20}" height="${h - 20}" fill="none" stroke="white" stroke-width="2" rx="10" opacity="0.3"/>
        <text x="26" y="34" font-family="Arial" font-size="18" font-weight="bold" fill="white" opacity="0.9">LK</text>
        <text x="${w / 2}" y="${h - 12}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="white" opacity="0.9">Linkie © 2026</text>
      </svg>`,
  },
  {
    id: 4,
    label: 'Festival Gold',
    thumb: 'linear-gradient(135deg,#fbbf24,#f97316)',
    render: (w: number, h: number) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <defs>
          <linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#f97316"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="url(#g4)" stroke-width="18" rx="16"/>
        <circle cx="${w - 38}" cy="38" r="22" fill="#fbbf24" opacity="0.85"/>
        <text x="${w - 38}" y="44" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold" fill="#0a0a1a">LK</text>
        <text x="${w / 2}" y="${h - 12}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#fbbf24">Festival 2026</text>
      </svg>`,
  },
];

const LKCaptureButton = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" stroke="#e91e8c" strokeWidth="3" fill="#0d1117" />
    <defs>
      <linearGradient id="btnGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00e5ff" />
        <stop offset="1" stopColor="#e91e8c" />
      </linearGradient>
    </defs>
    <line x1="32" y1="10" x2="32" y2="16" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="32" y1="48" x2="32" y2="54" stroke="#e91e8c" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="10" y1="32" x2="16" y2="32" stroke="#e91e8c" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="48" y1="32" x2="54" y2="32" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M15 15 L20 20 M49 49 L44 44 M49 15 L44 20 M15 49 L20 44" stroke="url(#btnGrad)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M22 28 L22 38 L26 38" stroke="url(#btnGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M30 28 L30 38 M30 33 L38 28 M30 33 L38 38" stroke="url(#btnGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function CameraFramePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventName = eventNames[Number(id)] ?? 'Sự kiện';

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [selectedFrame, setSelectedFrame] = useState(0); // index into FRAMES
  const [cameraError, setCameraError] = useState('');
  const [flashVisible, setFlashVisible] = useState(false);

  // ── Start camera ──────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => setCameraError('Không thể truy cập camera. Vui lòng cấp quyền camera.'));

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Capture & download ────────────────────────────────────────────────────
  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const W = video.videoWidth || 390;
    const H = video.videoHeight || 844;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // 1) Draw camera frame
    ctx.drawImage(video, 0, 0, W, H);

    // 2) Draw SVG frame overlay
    const svgString = FRAMES[selectedFrame].render(W, H);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);

      // 3) Flash effect
      setFlashVisible(true);
      setTimeout(() => setFlashVisible(false), 300);

      // 4) Download
      const link = document.createElement('a');
      link.download = `linkie-${eventName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();
    };
    img.src = url;
  }, [selectedFrame, eventName]);

  return (
    <div className="bg-[#0d1117] min-h-screen text-white flex flex-col pb-4">
      <Navbar />

      {/* ── Header ──────────────────────────────────── */}
      <div className="pt-16 px-5 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white mb-1 hover:opacity-70 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-base font-bold">Camera Frame</span>
        </button>
        <p className="text-gray-400 text-sm pl-6">{eventName}</p>
      </div>

      {/* ── Camera viewfinder ────────────────────────── */}
      <div className="relative mx-4 mt-2 rounded-2xl overflow-hidden bg-black aspect-[3/4]">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center text-center px-6">
            <div>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e91e8c" strokeWidth="1.5" className="mx-auto mb-3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <p className="text-gray-400 text-sm">{cameraError}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Live camera feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Frame SVG overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              dangerouslySetInnerHTML={{
                __html: FRAMES[selectedFrame].render(390, 520),
              }}
            />

            {/* Viewfinder center icon (hidden once camera starts) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity={0.3}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>

            {/* Flash overlay */}
            {flashVisible && (
              <div className="absolute inset-0 bg-white animate-ping" style={{ animationDuration: '0.15s', animationIterationCount: 1 }} />
            )}
          </>
        )}
      </div>

      {/* Hidden canvas for compositing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Capture button ───────────────────────────── */}
      <div className="flex justify-center mt-5 mb-4">
        <button
          onClick={handleCapture}
          disabled={!!cameraError}
          className="active:scale-95 transition-transform disabled:opacity-40"
          aria-label="Chụp ảnh"
        >
          <LKCaptureButton />
        </button>
      </div>

      {/* ── Frame selector ───────────────────────────── */}
      <div className="px-4">
        <p className="text-white font-bold text-sm mb-3">Frame</p>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {FRAMES.map((frame, idx) => (
            <button
              key={frame.id}
              onClick={() => setSelectedFrame(idx)}
              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                selectedFrame === idx
                  ? 'border-[#e91e8c] scale-105'
                  : 'border-white/20 hover:border-white/50'
              }`}
            >
              <div
                className="w-full h-full flex items-end p-1.5 relative"
                style={{ background: frame.thumb }}
              >
                {/* Mini frame preview via inline SVG */}
                <div
                  className="absolute inset-0"
                  dangerouslySetInnerHTML={{ __html: frame.render(80, 80) }}
                />
                <span className="relative text-white text-[9px] font-semibold drop-shadow z-10">
                  {frame.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

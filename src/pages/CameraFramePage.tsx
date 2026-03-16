import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { eventService, type PublicEvent, type ArFrame } from '../services/eventService';

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [frames, setFrames] = useState<ArFrame[]>([]);
  const [selectedFrameIdx, setSelectedFrameIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [flashVisible, setFlashVisible] = useState(false);

  // ── Fetch Event & Frames ───────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [evtData, framesData] = await Promise.all([
          eventService.getEventById(id),
          eventService.getEventFrames(id)
        ]);
        setEvent(evtData);
        setFrames(framesData);
      } catch {
        // silently fail — loading state handled by finally
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ── Start camera ──────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
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
    const frame = frames[selectedFrameIdx];
    if (!video || !canvas || !frame) return;

    const W = video.videoWidth || 390;
    const H = video.videoHeight || 844;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // 1) Draw camera frame
    ctx.drawImage(video, 0, 0, W, H);

    // 2) Draw Frame overlay (remote PNG/SVG)
    const img = new Image();
    img.crossOrigin = "anonymous"; // Important for remote URL canvas tainting
    img.onload = () => {
      ctx.drawImage(img, 0, 0, W, H);
      
      // 3) Flash effect
      setFlashVisible(true);
      setTimeout(() => setFlashVisible(false), 300);

      // 4) Download
      const link = document.createElement('a');
      link.download = `linkie-${event?.name.replace(/\s+/g, '-').toLowerCase() || 'photo'}-${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();

      // 5) Record usage in BE
      if (id && frame.id) {
        eventService.recordFrameUsage(id, frame.id).catch(err => {
          console.error('Failed to record frame usage:', err);
        });
      }
    };
    img.src = frame.assetUrl;
  }, [frames, selectedFrameIdx, event, id]);

  if (loading) {
    return (
      <div className="bg-[#0d1117] min-h-screen text-white flex flex-col items-center justify-center">
        <div className="animate-spin text-4xl mb-4">⟳</div>
        <p className="text-gray-400">Đang chuẩn bị camera...</p>
      </div>
    );
  }

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
        <p className="text-gray-400 text-sm pl-6">{event?.name || 'Sự kiện'}</p>
      </div>

      {/* ── Camera viewfinder ────────────────────────── */}
      <div className="relative mx-4 mt-2 rounded-xl overflow-hidden bg-black aspect-[3/4]">
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
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Frame overlay */}
            {frames[selectedFrameIdx] && (
              <img
                src={frames[selectedFrameIdx].assetUrl}
                alt="AR Frame"
                className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none z-10"
              />
            )}

            {/* Flash overlay */}
            {flashVisible && (
              <div className="absolute inset-0 bg-white animate-ping z-20" style={{ animationDuration: '0.15s', animationIterationCount: 1 }} />
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* ── Capture button ───────────────────────────── */}
      <div className="flex justify-center mt-5 mb-4">
        <button
          onClick={handleCapture}
          disabled={!!cameraError || frames.length === 0}
          className="active:scale-95 transition-transform disabled:opacity-40"
        >
          <LKCaptureButton />
        </button>
      </div>

      {/* ── Frame selector ───────────────────────────── */}
      <div className="px-4">
        <p className="text-white font-bold text-sm mb-3">Frame ({frames.length})</p>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {frames.map((frame, idx) => (
            <button
              key={frame.id}
              onClick={() => setSelectedFrameIdx(idx)}
              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all bg-black ${
                selectedFrameIdx === idx
                  ? 'border-[#e91e8c] scale-105'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <img
                src={frame.assetUrl}
                alt={frame.name}
                className="w-full h-full object-contain p-1"
              />
            </button>
          ))}
          {frames.length === 0 && !loading && (
            <div className="text-gray-600 text-xs italic py-4">Sự kiện này chưa có khung hình AR.</div>
          )}
        </div>
      </div>
    </div>
  );
}

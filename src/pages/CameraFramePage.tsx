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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showFramePicker, setShowFramePicker] = useState(false);

  // ── Fetch Event & Frames ───────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [evtData, framesData] = await Promise.all([
          eventService.getEventById(id),
          eventService.getEventFrames(id)
        ]);
        if (isMounted) {
          setEvent(evtData);
          setFrames(framesData);
        }
      } catch {
        // fail silently
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [id]);

  // ── Camera Lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isComponentMounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false
        });

        if (!isComponentMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        activeStream = stream;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError('');
      } catch (err) {
        if (isComponentMounted) {
          console.error('Camera access error:', err);
          setCameraError('Không thể truy cập camera. Vui lòng cấp quyền camera.');
        }
      }
    };

    startCamera();

    return () => {
      isComponentMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

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
    if (facingMode === 'user') {
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, W, H);
    if (facingMode === 'user') {
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    }

    // 2) Draw Frame overlay
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, 0, 0, W, H);
      
      setFlashVisible(true);
      setTimeout(() => setFlashVisible(false), 300);

      const link = document.createElement('a');
      link.download = `linkie-${event?.name.replace(/\s+/g, '-').toLowerCase() || 'photo'}-${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();

      if (id && frame.id) {
        eventService.recordFrameUsage(id, frame.id).catch(err => {
          console.error('Failed to record frame usage:', err);
        });
      }
    };
    img.src = frame.assetUrl;
  }, [frames, selectedFrameIdx, event, id, facingMode]);

  if (loading) {
    return (
      <div className="bg-[#0d1117] min-h-screen text-white flex flex-col items-center justify-center">
        <div className="animate-spin text-4xl mb-4 text-[#00e5ff]">⟳</div>
        <p className="text-gray-400">Đang chuẩn bị camera...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] min-h-screen text-white flex flex-col overflow-hidden">
      <Navbar />

      {/* ── Header ──────────────────────────────────── */}
      <div className="pt-16 px-5 pb-1 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white hover:opacity-70 transition-opacity shrink-0"
          >
            <div className="bg-white/10 p-1.5 rounded-full">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </div>
            <span className="text-sm font-bold">Chụp ảnh AR</span>
          </button>
          <span className="text-white/20 text-xs">•</span>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest truncate">{event?.name || 'Sự kiện'}</p>
        </div>
      </div>

      {/* ── Camera viewfinder ────────────────────────── */}
      <div className="relative flex-1 mx-4 mt-2 rounded-2xl overflow-hidden bg-black shadow-2xl shadow-pink-500/10 border border-white/5">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center text-center px-8 bg-gray-900/50 backdrop-blur-sm">
            <div>
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </div>
              <p className="text-red-400 font-medium mb-2">{cameraError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-xs bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-colors"
              >
                Tải lại trang
              </button>
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
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />

            {/* Frame overlay */}
            {frames[selectedFrameIdx] && (
              <div className="absolute inset-0 pointer-events-none z-10">
                <img
                  src={frames[selectedFrameIdx].assetUrl}
                  alt="AR Frame"
                  className="w-full h-full object-fill"
                />
              </div>
            )}

            {/* Flash overlay */}
            {flashVisible && (
              <div className="absolute inset-0 bg-white z-20 opacity-80" />
            )}

            {/* Current Frame Name Tag */}
            {frames[selectedFrameIdx] && !showFramePicker && (
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full pointer-events-none">
                 <p className="text-[10px] text-white/80 font-medium uppercase tracking-widest">{frames[selectedFrameIdx].name}</p>
               </div>
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* ── Main Controls ───────────────────────────── */}
      <div className="px-6 py-6 shrink-0 flex items-center justify-between gap-4">
        {/* Left: Frame Picker Trigger */}
        <button
          onClick={() => setShowFramePicker(true)}
          className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center group active:scale-90 transition-all"
        >
          <div className="w-7 h-7 mb-0.5 rounded border-2 border-dashed border-pink-500/50 flex items-center justify-center overflow-hidden">
             {frames[selectedFrameIdx] ? (
               <img src={frames[selectedFrameIdx].assetUrl} className="w-full h-full object-contain p-0.5" alt="prev" />
             ) : (
               <div className="w-2 h-2 bg-pink-500 rounded-full" />
             )}
          </div>
          <span className="text-[8px] font-bold text-white/40 group-hover:text-pink-400">FRAMES</span>
        </button>

        {/* Center: Capture */}
        <button
          onClick={handleCapture}
          disabled={!!cameraError || frames.length === 0}
          className="active:scale-95 transition-transform disabled:opacity-30 disabled:grayscale relative"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[#00e5ff] to-[#e91e8c] rounded-full blur-md opacity-20 animate-pulse" />
          <LKCaptureButton />
        </button>

        {/* Right: Camera Switch */}
        <button
          onClick={toggleCamera}
          className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center group active:scale-90 transition-all font-bold"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60 group-hover:text-[#00e5ff] mb-0.5">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M15 13a3 3 0 0 0-3-3" />
          </svg>
          <span className="text-[8px] text-white/40 group-hover:text-[#00e5ff]">SWITCH</span>
        </button>
      </div>

      {/* ── AR Frame Pop-up ──────────────────────────── */}
      {showFramePicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-10 sm:pb-6">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowFramePicker(false)}
          />
          <div className="relative w-full max-w-md bg-[#1a1c23] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-300">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Chọn AR Frame</h3>
                <p className="text-xs text-gray-400">Có {frames.length} khung hình khả dụng</p>
              </div>
              <button 
                onClick={() => setShowFramePicker(false)}
                className="bg-white/5 p-2 rounded-full hover:bg-white/10 text-gray-400"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto min-h-[120px]">
              {frames.map((frame, idx) => (
                <button
                  key={frame.id}
                  onClick={() => {
                    setSelectedFrameIdx(idx);
                    setShowFramePicker(false);
                  }}
                  className={`relative flex flex-col items-center gap-2 p-2 rounded-2xl transition-all border-2 ${
                    selectedFrameIdx === idx
                      ? 'bg-pink-500/10 border-pink-500 shadow-lg shadow-pink-500/20'
                      : 'bg-white/5 border-transparent hover:border-white/20'
                  }`}
                >
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-black/40 p-2">
                    <img
                      src={frame.assetUrl}
                      alt={frame.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className={`text-[10px] font-bold truncate w-full text-center ${
                    selectedFrameIdx === idx ? 'text-pink-400' : 'text-gray-400'
                  }`}>
                    {frame.name}
                  </span>
                  {selectedFrameIdx === idx && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center border-2 border-[#1a1c23]">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
              {frames.length === 0 && (
                <div className="col-span-3 text-center py-8 text-gray-500 italic">
                  Không tìm thấy khung hình nào.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

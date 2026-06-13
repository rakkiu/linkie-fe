import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { eventService, type PublicEvent, type ArFrame } from '../../services/eventService';
import type { PhotoboothLayout, StickerItem } from './PhotoboothCompositor';
import { useTicketVerification } from '../../hooks/useTicketVerification';

import LayoutSelectionScreen from './LayoutSelectionScreen';
import CaptureScreen from './CaptureScreen';
import ReviewScreen from './ReviewScreen';
import EditScreen from './EditScreen';
import SaveScreen from './SaveScreen';

export default function PhotoboothPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── States ──────────────────────────────────────────────────────────────────
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [frames, setFrames] = useState<ArFrame[]>([]);
  const [loading, setLoading] = useState(true);
  const { ticketStatus, loading: ticketLoading } = useTicketVerification(id);

  // Session state
  const [currentStep, setCurrentStep] = useState(0); // 0=Layout, 1=Capture, 2=Review, 3=Edit, 4=Save
  const [selectedLayout, setSelectedLayout] = useState<PhotoboothLayout>('grid2x2');
  const [selectedFrame, setSelectedFrame] = useState<ArFrame | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [timelapseFrames, setTimelapseFrames] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [compositeResult, setCompositeResult] = useState<string | null>(null);

  const stepLabels = ['Bố cục', 'Chụp ảnh', 'Xem lại', 'Sticker', 'Lưu'];

  // ── Fetch Event & Frames ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [evtData, framesData] = await Promise.all([
          eventService.getEventById(id),
          eventService.getEventFrames(id),
        ]);

        if (isMounted) {
          setEvent(evtData);
          const pbFrames = framesData
            .filter(f => f.name.toLowerCase().startsWith('photobooth_'))
            .map(f => ({ ...f, name: f.name.replace(/^photobooth_/i, '') }));
          setFrames(pbFrames);
          if (pbFrames.length > 0) {
            setSelectedFrame(pbFrames[0]);
          } else {
            setSelectedFrame(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch event data for photobooth:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // ── Quay lại bước trước / Thoát ───────────────────────────────────────────────
  const handleBack = () => {
    if (currentStep > 0) {
      if (currentStep === 2) {
        setCapturedPhotos([]);
        setSelectedIndices([]);
      }
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
  };

  // ── Restart Flow ─────────────────────────────────────────────────────────────
  const handleRestart = () => {
    setCapturedPhotos([]);
    setSelectedIndices([]);
    setStickers([]);
    setTimelapseFrames([]);
    setZoomLevel(1.0);
    setCompositeResult(null);
    setCurrentStep(0);
  };

  // ── Auto-select mới nhất nếu chưa đủ ảnh (Tách rời tránh lỗi StrictMode) ───
  useEffect(() => {
    const requiredCount = selectedLayout === 'grid2x4' ? 8 : selectedLayout === 'strip1x2' ? 2 : 4;
    if (selectedIndices.length < requiredCount && capturedPhotos.length > 0) {
      setSelectedIndices((prev) => {
        const nextIndices = [...prev];
        let changed = false;
        for (let i = 0; i < capturedPhotos.length; i++) {
          if (nextIndices.length >= requiredCount) break;
          if (!nextIndices.includes(i)) {
            nextIndices.push(i);
            changed = true;
          }
        }
        return changed ? nextIndices : prev;
      });
    }
  }, [capturedPhotos.length, selectedLayout, selectedIndices.length]);

  // ── Render Từng Màn Hình Thành Phần ──────────────────────────────────────────
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <LayoutSelectionScreen
            frames={frames}
            selectedFrame={selectedFrame}
            selectedLayout={selectedLayout}
            onConfirm={(layout, frame) => {
              setSelectedLayout(layout);
              setSelectedFrame(frame);
              setCurrentStep(1);
            }}
          />
        );
      case 1: {
        const requiredCount = selectedLayout === 'grid2x4' ? 8 : selectedLayout === 'strip1x2' ? 2 : 4;
        return (
          <CaptureScreen
            layout={selectedLayout}
            capturedPhotos={capturedPhotos}
            requiredCount={requiredCount}
            isFrontCamera={isFrontCamera}
            zoomLevel={zoomLevel}
            onAddPhoto={(photo) => {
              setCapturedPhotos((prev) => [...prev, photo]);
            }}
            onAddTimelapseFrame={(frame) => setTimelapseFrames((prev) => [...prev, frame])}
            onToggleFrontCamera={setIsFrontCamera}
            onZoomChange={setZoomLevel}
            onComplete={() => setCurrentStep(2)}
          />
        );
      }
      case 2:
        return (
          <ReviewScreen
            layout={selectedLayout}
            capturedPhotos={capturedPhotos}
            selectedIndices={selectedIndices}
            onToggleSelection={(idx) => {
              setSelectedIndices((prev) => {
                const requiredCount = selectedLayout === 'grid2x4' ? 8 : selectedLayout === 'strip1x2' ? 2 : 4;
                if (prev.includes(idx)) {
                  return prev.filter((i) => i !== idx);
                } else if (prev.length < requiredCount) {
                  return [...prev, idx];
                }
                return prev;
              });
            }}
            onRetake={() => {
              setCapturedPhotos([]);
              setSelectedIndices([]);
              setCurrentStep(1);
            }}
            onConfirm={() => setCurrentStep(3)}
          />
        );
      case 3: {
        const selectedPhotos = selectedIndices.map((idx) => capturedPhotos[idx]);
        return (
          <EditScreen
            layout={selectedLayout}
            selectedPhotos={selectedPhotos}
            selectedFrame={selectedFrame}
            stickers={stickers}
            isFrontCamera={isFrontCamera}
            onAddSticker={(sticker) => setStickers((prev) => [...prev, sticker])}
            onUpdateStickers={setStickers}
            onComplete={(finalImage) => {
              setCompositeResult(finalImage);
              setCurrentStep(4);
            }}
          />
        );
      }
      case 4: {
        const selectedPhotos = selectedIndices.map((idx) => capturedPhotos[idx]);
        return (
          <SaveScreen
            eventId={id || ''}
            eventName={event?.name || 'Sự kiện'}
            frames={frames}
            selectedFrame={selectedFrame}
            layout={selectedLayout}
            selectedPhotos={selectedPhotos}
            stickers={stickers}
            isFrontCamera={isFrontCamera}
            compositeImage={compositeResult || ''}
            timelapseFrames={timelapseFrames}
            onRestart={handleRestart}
          />
        );
      }
      default:
        return null;
    }
  };

  if (loading || ticketLoading) {
    return (
      <div className="bg-[#0d1117] min-h-screen text-white flex flex-col items-center justify-center">
        <div className="animate-spin text-4xl mb-4 text-[#00e5ff]">⟳</div>
        <p className="text-gray-400">Đang tải thông tin sự kiện...</p>
      </div>
    );
  }

  if (ticketStatus && !ticketStatus.hasValidTicket) {
    return (
      <div className="bg-[#0d1117] min-h-screen text-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-6">🎟️</div>
        <h2 className="text-2xl font-bold mb-3">Bạn chưa có vé cho sự kiện này</h2>
        <p className="text-gray-400 text-sm max-w-sm">
          Vui lòng mua vé để sử dụng tính năng Photobooth.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-8 px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/20 transition-all"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] h-screen h-[100dvh] text-white flex flex-col overflow-hidden">
      <Navbar />

      {/* ── Header with step indicator ──────────────── */}
      <div className="pt-20 px-5 pb-2 shrink-0 max-w-md mx-auto w-full">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white hover:opacity-70 transition-opacity shrink-0"
          >
            <div className="bg-white/10 p-1.5 rounded-full">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </div>
            <span className="text-sm font-bold">Photobooth</span>
          </button>
          <span className="text-white/20 text-xs">•</span>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest truncate">
            {event?.name || 'Sự kiện'}
          </p>
        </div>

        {/* Step Indicator dots & labels */}
        <div className="flex justify-between items-center mt-5 gap-1 select-none">
          {stepLabels.map((label, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`h-1 w-full rounded-full transition-all duration-300 ${
                    isDone
                      ? 'bg-pink-500'
                      : isActive
                      ? 'bg-pink-500/60'
                      : 'bg-white/10'
                  }`}
                />
                <span
                  className={`text-[8px] font-bold tracking-wide uppercase transition-all duration-200 ${
                    isActive
                      ? 'text-white font-extrabold'
                      : isDone
                      ? 'text-pink-500'
                      : 'text-gray-600'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Screen View ─────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {renderCurrentStep()}
      </div>
    </div>
  );
}

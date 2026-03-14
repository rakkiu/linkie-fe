import { useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import { eventService, type PublicEvent } from '../services/eventService';

const CameraIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const WishwallIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e91e8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        const data = await eventService.getEventById(id);
        setEvent(data);
      } catch {
        // silently fail — loading state handled by finally
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-[#0a0a1a] min-h-screen text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#00e5ff] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="bg-[#0a0a1a] min-h-screen text-white flex items-center justify-center">
        <p>Sự kiện không tồn tại.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] min-h-screen text-white flex flex-col">
      <Navbar />

      {/* ── Page header ────────────────────────────── */}
      <div className="pt-20 px-6 pb-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/')}
            className="mt-1 hover:opacity-70 transition-opacity"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black tracking-tight">{event.name}</h1>
            <p className="text-gray-400 text-sm font-medium mt-0.5">Lựa chọn tiện ích trải nghiệm</p>
          </div>
        </div>
      </div>

      {/* ── Feature cards ──────────────────────────── */}
      <div className="flex flex-col gap-6 px-6 pt-2 flex-1 mb-32">
        {/* Camera Frame */}
        <Link
          to={`/events/${id}/camera-frame`}
          className="flex flex-col items-center justify-center rounded-[40px] h-64 gap-4 px-6
            bg-gradient-to-br from-[#00bcd4] to-[#008ba3]
            hover:brightness-105 active:scale-[0.98] transition-all border border-white/10"
        >
          <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-4">
            <div className="bg-white rounded-xl p-2.5">
              <CameraIcon />
            </div>
          </div>
          <div className="text-center">
            <p className="text-white font-black text-xl tracking-wide">Camera Frame</p>
            <p className="text-white/90 text-[13px] mt-1 font-medium leading-tight">
              Lưu giữ khoảnh khắc cùng Frame độc quyền
            </p>
          </div>
        </Link>

        {/* Wishwall */}
        <Link
          to={`/events/${id}/wishwall`}
          className="flex flex-col items-center justify-center rounded-[40px] h-64 gap-4 px-6
            bg-gradient-to-br from-[#e91e8c] to-[#9c27b0]
            hover:brightness-105 active:scale-[0.98] transition-all border border-white/10"
        >
          <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-4">
            <div className="bg-white rounded-xl p-2.5">
              <WishwallIcon />
            </div>
          </div>
          <div className="text-center">
            <p className="text-white font-black text-xl tracking-wide">Wishwall</p>
            <p className="text-white/90 text-[13px] mt-1 font-medium leading-tight">
              Gửi lời tâm tình đến màn hình LED
            </p>
          </div>
        </Link>
      </div>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0a0a1a] border-t border-white/5 py-3 text-center z-40">
        <div className="flex items-center justify-center gap-2 mb-0.5">
          <img src="/image.png" alt="Linkle" className="h-6 w-auto" />
          <span className="text-sm font-bold text-[#00bcd4]">Linkle</span>
        </div>
        <p className="text-gray-500 text-[10px]">
          Xóa nhòa khoảng cách giữa sân khấu và khán giả.
        </p>
      </footer>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

interface ApiEvent {
  id: string;
  name: string;
  status: 'Upcoming' | 'Ongoing' | 'Finished';
}

interface ApiResponse<T> {
  statusCode: number;
  data: T;
}

const CameraIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const WishwallIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    // Reuse the events list and find the matching one by id
    axios
      .get<ApiResponse<ApiEvent[]>>('/api/events')
      .then(res => {
        const found = (res.data.data ?? []).find(e => e.id === id) ?? null;
        setEvent(found);
      })
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="bg-[#0a0a1a] min-h-screen text-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">Đang tải…</p>
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
    <div className="bg-[#0d1117] min-h-screen text-white flex flex-col pb-20">
      <Navbar />

      {/* ── Page header ────────────────────────────── */}
      <div className="pt-16 px-5 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white mb-3 hover:opacity-70 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-base font-bold">{event.name}</span>
        </button>
        <p className="text-gray-400 text-sm pl-6">Lựa chọn tiện ích trải nghiệm</p>
      </div>

      {/* ── Feature cards ──────────────────────────── */}
      <div className="flex flex-col gap-4 px-5 pt-4 flex-1">
        {/* Camera Frame */}
        <Link
          to={`/events/${id}/camera-frame`}
          className="flex flex-col items-center justify-center rounded-3xl h-56 gap-3
            bg-gradient-to-br from-[#00bcd4] to-[#006064]
            hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <div className="bg-white/20 rounded-2xl p-3">
            <CameraIcon />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">Camera Frame</p>
            <p className="text-white/80 text-xs mt-0.5">Lưu giữ khoảnh khắc cùng Frame độc quyền</p>
          </div>
        </Link>

        {/* Wishwall */}
        <Link
          to={`/events/${id}/wishwall`}
          className="flex flex-col items-center justify-center rounded-3xl h-56 gap-3
            bg-gradient-to-br from-[#e91e8c] to-[#7b1fa2]
            hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <div className="bg-white/20 rounded-2xl p-3">
            <WishwallIcon />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">Wishwall</p>
            <p className="text-white/80 text-xs mt-0.5">Gửi lời tâm tình đến màn hình LED</p>
          </div>
        </Link>
      </div>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0a0a1a] border-t border-white/5 py-3 text-center z-40">
        <p className="text-[#e91e8c] font-extrabold text-lg leading-none">Linkie</p>
        <p className="text-gray-500 text-[10px] mt-0.5">Xóa nhòa khoảng cách giữa sân khấu và khán giả.</p>
      </footer>
    </div>
  );
}

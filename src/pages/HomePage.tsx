import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { eventService, type PublicEvent, getEventStatus } from '../services/eventService';

import logoLinkie from '../image/Linkie.png';
import logoLinkieWhite from '../image/logo-linkie-white.png';

import bannerIntro from '../image/banner-intro.jpg';
import bannerWishwall from '../image/banner-wishwall.jpg';
import bannerCameraFrame from '../image/banner-CameraFrame.jpg';

const LKLogoCard = () => (
  <div className="w-[104px] h-[104px] bg-white rounded-[32px] flex items-center justify-center flex-shrink-0 shadow-lg p-3 border-3 border-[#00d5ff]">
    <img
      src={logoLinkieWhite}
      alt="Linkie logo"
      className="w-full h-full object-contain"
    />
  </div>
);

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'staff') {
      navigate('/staff/wishwall', { replace: true });
      return;
    }
    if (user?.role === 'led') {
      navigate('/led', { replace: true });
      return;
    }

    const fetchEvents = async () => {
      try {
        const data = await eventService.getAllEvents('Active');
        const visibleEvents = data.filter(e => getEventStatus(e) !== 'past');
        setEvents(visibleEvents);
      } catch (err) {
        console.error('Failed to fetch public events', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [user, navigate]);

  return (
    <div className="bg-[#0a0a1a] min-h-screen text-white">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative h-[65vh] overflow-hidden">
        <img
          src={bannerIntro}
          alt="Sự kiện"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-black/20 to-black/40" />
        <div className="relative z-10 flex flex-col justify-end h-full px-6 pb-12 pt-14">
          <h1 className="text-5xl font-black text-white mb-5 tracking-wide drop-shadow-lg">
            NHẬP CUỘC
          </h1>
          <a
            href="#events"
            className="w-fit border border-[#00e5ff] text-[#00e5ff] text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#00e5ff]/10 transition-colors"
          >
            Trải nghiệm ngay
          </a>
        </div>
      </section>

      {/* ── About ────────────────────────────────────── */}
      <section id="about" className="px-5 pt-8 pb-6">
        <h2 className="text-center text-xl font-bold mb-7">Về chúng tôi</h2>

        <div className="flex items-start gap-4 mb-5">
          <div className="flex-1">
            <img src={logoLinkie} alt="Linkie" className="h-15 w-auto mb-2" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Linkie là nền tảng kết nối tương tác trực tiếp tại sự kiện thông qua công nghệ
              Camera và Wishwall, giúp biến mỗi cá nhân trở thành một phần di sản của không
              gian nghệ thuật.
            </p>
          </div>
          <LKLogoCard />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3">
          {[
            {
              label: 'Tầm nhìn',
              text: 'Trở thành nền tảng tương tác cho mọi không gian sự kiện, nơi mỗi cá nhân đều có thể chia sẻ trải nghiệm và lưu giữ ký ức cùng xúc cảm riêng mình.',
            },
            {
              label: 'Sứ mệnh',
              text: 'Xóa nhòa khoảng cách giữa khán giả và sân khấu thông qua những điểm chạm công nghệ sáng tạo.',
            },
          ].map(({ label, text }) => (
            <div
              key={label}
              className="relative rounded-2xl bg-[#273556] px-3.5 pb-3.5 pt-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <span className="absolute left-1/2 -top-3 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#00d8ff] bg-gradient-to-r from-[#06d4ff] to-[#e347af] px-4 py-1 text-[11px] font-bold text-white leading-none shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                {label}
              </span>
              <p className="text-[10px] text-[#d7e1ff] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features title ───────────────────────────── */}
      <section className="px-5 pb-4 pt-2">
        <h2 className="text-center text-xl font-bold">Tính năng</h2>
      </section>

      {/* ── WishWall Feature Banner ───────────────────── */}
      <section className="px-5 pb-2">
        <Link
          to="/events"
          className="relative block overflow-hidden rounded-3xl border border-[#00bcd4]/25 hover:border-[#00bcd4]/50 transition-all active:scale-[0.98] cursor-pointer group"
        >
          <img
            src={bannerWishwall}
            alt="Wishwall"
            className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />
          <div className="absolute inset-0 p-5 flex flex-col justify-end">
            <h3 className="text-4xl font-black text-white mb-1 tracking-wide uppercase">WISHWALL</h3>
            <p className="text-xs text-gray-200 mb-5">Một phần không thể thiếu của sự kiện</p>
            <div className="flex gap-6">
              {['Viết lời chúc', 'Gửi đi', 'Hiện trên LED'].map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-full border-[2.5px] border-[#00e5ff] bg-[#00e5ff]/20 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{i + 1}</span>
                  </div>
                  <span className="text-white text-[10px] text-center leading-tight max-w-[62px]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Link>
      </section>

      {/* ── Camera Frame Feature Banner ───────────────── */}
      <section className="px-5 pb-2">
        <Link
          to="/events"
          className="relative block overflow-hidden rounded-3xl border border-[#00bcd4]/25 hover:border-[#00bcd4]/50 transition-all active:scale-[0.98] cursor-pointer group"
        >
          <img
            src={bannerCameraFrame}
            alt="Camera Frame"
            className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

          <div className="absolute inset-0 p-5 flex flex-col justify-end">
            <h3 className="text-4xl font-black text-white mb-1 tracking-wide">Camera AR</h3>
            <p className="text-xs text-gray-200 mb-5">
              Lưu giữ khoảnh khắc cùng AR Frame độc quyền
            </p>

            <div className="flex gap-6">
              {['Chọn AR Frame', 'Chụp ảnh', 'Lưu & Chia sẻ'].map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-full border-[2.5px] border-[#00e5ff] bg-[#00e5ff]/20 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{i + 1}</span>
                  </div>
                  <span className="text-white text-[10px] text-center leading-tight max-w-[62px]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Link>
      </section>

      {/* ── Events ───────────────────────────────────── */}
      <section id="events" className="px-5 pt-6 pb-4">
        <h2 className="text-center text-xl font-bold mb-5">Hôm nay có gì?</h2>

        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex justify-center items-center py-10 opacity-50">
              <div className="animate-spin w-8 h-8 border-4 border-[#00e5ff] border-t-transparent rounded-full" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Hiện không có sự kiện nào đang hoạt động.</div>
          ) : (
            events.map((event) => {
              const status = getEventStatus(event);
              const startDate = new Date(event.startTime);
              const fallbackImage = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&w=800&q=80';

              return (
                <div key={event.id} className="block">
                  <div
                    className={`relative rounded-2xl overflow-hidden border transition-colors ${status === 'live'
                        ? 'border-[#00bcd4]/40 hover:border-[#00bcd4]/80 cursor-pointer shadow-lg shadow-[#00e5ff]/5'
                        : 'border-white/10 opacity-70 cursor-not-allowed'
                      }`}
                    onClick={() => status === 'live' && navigate(`/events/${event.id}`)}
                  >
                    {/* Status badge */}
                    <div className="absolute top-3 left-3 z-10">
                      {status === 'live' ? (
                        <span className="flex items-center gap-1.5 bg-[#0a0a1a]/80 text-white text-xs px-3 py-1.5 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          Đang diễn ra
                        </span>
                      ) : (
                        <span className="bg-white/90 text-[#0a0a1a] text-xs px-3 py-1.5 rounded-full font-medium">
                          Sắp diễn ra
                        </span>
                      )}
                    </div>

                    <img
                      src={event.thumbnailUrl || fallbackImage}
                      alt={event.name}
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div className="max-w-[70%]">
                        <p className="text-white font-bold text-sm leading-tight uppercase truncate">{event.name}</p>
                        <p className="text-gray-400 text-xs">{startDate.getFullYear()}</p>
                      </div>
                      <div className="bg-[#0a0a1a]/80 border border-white/20 rounded-xl px-3 py-2 text-center min-w-[52px]">
                        <p className="text-white/60 text-[9px] uppercase">Tháng {startDate.getMonth() + 1}</p>
                        <p className="text-white text-2xl font-black leading-none">
                          {String(startDate.getDate()).padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="bg-[#0a0a1a] border-t border-white/10 mt-6">
        {/* Logo banner */}
        <div className="mx-5 mt-6 mb-5 rounded-2xl bg-[#1a2540] px-5 py-4 flex flex-col items-center gap-1">
          <img src={logoLinkie} alt="Linkie" className="h-8 w-auto" />
          <p className="text-[11px] text-gray-400 text-center mt-1">
            Xóa nhòa khoảng cách giữa sân khấu và khán giả.
          </p>
        </div>

        {/* Content grid */}
        <div className="mx-5 flex gap-5">
          {/* Left: Contact */}
          <div className="flex-1">
            <p className="text-[11px] text-gray-400 mb-1">Bạn cần hỗ trợ</p>
            <p className="text-xl font-black text-white tracking-tight mb-3">0943414905</p>
            <p className="text-[11px] text-gray-400 mb-0.5">linkie.digital</p>
            <p className="text-[11px] text-gray-400 mb-4">linkie.project@gmail.com</p>

            {/* Social icons */}
            <div className="flex gap-3">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/profile.php?id=61589933237493"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 40 40" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="20" fill="#1877F2" />
                  <path d="M25 13h-2.5c-.83 0-1 .67-1 1.17V16h3.5l-.5 4H21.5v11h-4V20H15v-4h2.5v-2.5C17.5 10.3 19.43 9 22 9c1.2 0 3 .09 3 .09V13z" fill="white" />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@linkie.project"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center active:scale-90 transition-transform"
                aria-label="TikTok"
              >
                <svg viewBox="0 0 40 40" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="20" fill="#010101" />
                  <path d="M28 16.2a7.1 7.1 0 01-4.1-1.3v5.9a5.4 5.4 0 11-4.7-5.35v3a2.55 2.55 0 101.8 2.43V10h2.9a4.2 4.2 0 004.1 3.85v2.35z" fill="white" />
                  <path d="M23.9 14.9a7.1 7.1 0 004.1 1.3" fill="#69C9D0" opacity="0.7" />
                  <path d="M12 20.8a5.4 5.4 0 005.1 5.38" fill="#EE1D52" opacity="0.7" />
                </svg>
              </a>

              {/* Gmail */}
              <a
                href="mailto:linkie.project@gmail.com"
                className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Email"
              >
                <svg viewBox="0 0 40 40" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="20" fill="white" />
                  <path d="M10 14.5v12A1.5 1.5 0 0011.5 28h3V19.5L20 24l5.5-4.5V28h3a1.5 1.5 0 001.5-1.5v-12c0-1.1-1.26-1.73-2.13-1.06L20 18l-7.87-5.56C11.26 11.77 10 12.4 10 13.5v1z" fill="#EA4335" />
                  <path d="M11.5 13.44L20 19.5l8.5-6.06" fill="none" stroke="#FBBC05" strokeWidth="1" />
                  <path d="M14.5 28V19.5" fill="none" stroke="#34A853" strokeWidth="1.5" />
                  <path d="M25.5 28V19.5" fill="none" stroke="#4285F4" strokeWidth="1.5" />
                </svg>
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-white/15 self-stretch" />

          {/* Right: Nav links */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-sm font-bold text-white mb-2">Hướng dẫn</p>
              <ul className="flex flex-col gap-1.5">
                <li>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="text-[12px] text-gray-400 hover:text-white transition-colors"
                  >
                    Trang chủ
                  </button>
                </li>
                <li>
                  <Link to="/events" className="text-[12px] text-gray-400 hover:text-white transition-colors">
                    Sự kiện
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="text-[12px] text-gray-400 hover:text-white transition-colors"
                  >
                    Về chúng tôi
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-bold text-white mb-2">Về Linkie</p>
              <ul className="flex flex-col gap-1.5">
                {['Tầm nhìn', 'Sứ mệnh'].map((label) => (
                  <li key={label}>
                    <button
                      onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="text-[12px] text-gray-400 hover:text-white transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mx-5 mt-6 mb-5 pt-4 border-t border-white/10 flex flex-col gap-1.5">
          <p className="text-[10px] text-gray-500">
            Copyright © 2026 by Linkie. All rights reserved
          </p>
          <div className="flex gap-3">
            <a href="#" className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
              Điều khoản sử dụng
            </a>
            <span className="text-gray-600 text-[10px]">|</span>
            <a href="#" className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
              Chính sách bảo mật
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

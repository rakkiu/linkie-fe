import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const events = [
  {
    id: 1,
    name: 'NIGHTS FESTIVAL',
    year: '2026',
    image:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&w=800&q=80',
    status: 'live' as const,
    month: 3,
    day: 1,
  },
  {
    id: 2,
    name: 'FIREWORKS FESTIVAL',
    year: '2026',
    image:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&w=800&q=80',
    status: 'upcoming' as const,
    month: 3,
    day: 3,
  },
];

const LKLogoCard = () => (
  <div className="w-[88px] h-[88px] bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="aboutGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00e5ff" />
          <stop offset="1" stopColor="#e91e8c" />
        </linearGradient>
      </defs>
      {/* Star rays */}
      <line x1="32" y1="6"  x2="32" y2="14" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="50" x2="32" y2="58" stroke="#e91e8c" strokeWidth="2" strokeLinecap="round" />
      <line x1="6"  y1="32" x2="14" y2="32" stroke="#e91e8c" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="32" x2="58" y2="32" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="18" y2="18" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
      <line x1="52" y1="52" x2="46" y2="46" stroke="#e91e8c" strokeWidth="2" strokeLinecap="round" />
      <line x1="52" y1="12" x2="46" y2="18" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="52" x2="18" y2="46" stroke="#e91e8c" strokeWidth="2" strokeLinecap="round" />
      {/* L letter */}
      <path
        d="M14 20 L14 44 L22 44"
        stroke="url(#aboutGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* K letter */}
      <path
        d="M27 20 L27 44 M27 32 L42 20 M27 32 L42 44"
        stroke="url(#aboutGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="bg-[#0a0a1a] min-h-screen text-white pb-20">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative h-[65vh] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&w=800&q=80"
          alt="Concert"
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
            <h3 className="text-2xl font-extrabold text-[#e91e8c] mb-2">Linkie</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Linkie là nền tảng kết nối tương tác trực tiếp tại sự kiện thông qua công nghệ
              Camera và Wishwall, giúp biến mỗi cá nhân trở thành một phần di sản của không
              gian nghệ thuật.
            </p>
          </div>
          <LKLogoCard />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
            <div key={label} className="border border-[#00bcd4]/40 rounded-2xl p-4">
              <span className="inline-block border border-[#00bcd4] text-[#00bcd4] text-[11px] font-semibold px-3 py-1 rounded-full mb-3">
                {label}
              </span>
              <p className="text-[11px] text-gray-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features title ───────────────────────────── */}
      <section className="px-5 pb-4 pt-2">
        <h2 className="text-center text-xl font-bold">Tính năng</h2>
      </section>

      {/* ── WishWall Feature Banner ───────────────────── */}
      <section className="relative overflow-hidden mb-2">
        <img
          src="https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&w=800&q=80"
          alt="WishWall"
          className="w-full h-52 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25" />
        <div className="absolute inset-0 p-5 flex flex-col justify-center">
          <h3 className="text-4xl font-black text-white mb-1 tracking-widest">WISHWALL</h3>
          <p className="text-xs text-gray-300 mb-5">Trở thành một phần của bữa tiệc âm nhạc</p>
          <div className="flex gap-6">
            {['Nhập tin nhắn', 'Bấm gửi', 'Hiện thị trên LED'].map((label, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full border-[2.5px] border-[#e91e8c] bg-[#e91e8c]/20 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{i + 1}</span>
                </div>
                <span className="text-white text-[10px] text-center leading-tight max-w-[60px]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Events ───────────────────────────────────── */}
      <section id="events" className="px-5 pt-6 pb-4">
        <h2 className="text-center text-xl font-bold mb-5">Hôm nay có gì?</h2>

        <div className="flex flex-col gap-4">
          {events.map((event) => (
            <div key={event.id} className="block">
              <div
                className={`relative rounded-2xl overflow-hidden border transition-colors ${
                  event.status === 'live'
                    ? 'border-[#00bcd4]/40 hover:border-[#00bcd4]/80 cursor-pointer'
                    : 'border-white/10 opacity-70 cursor-not-allowed'
                }`}
                onClick={() => event.status === 'live' && navigate(`/events/${event.id}`)}
              >
                {/* Status badge */}
                <div className="absolute top-3 left-3 z-10">
                  {event.status === 'live' ? (
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
                  src={event.image}
                  alt={event.name}
                  className="w-full h-44 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">{event.name}</p>
                    <p className="text-gray-400 text-xs">{event.year}</p>
                  </div>
                  <div className="bg-[#0a0a1a]/80 border border-white/20 rounded-xl px-3 py-2 text-center min-w-[52px]">
                    <p className="text-white/60 text-[9px] uppercase">Tháng {event.month}</p>
                    <p className="text-white text-2xl font-black leading-none">
                      {String(event.day).padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0a0a1a] border-t border-white/5 py-3 text-center z-40">
        <p className="text-[#e91e8c] font-extrabold text-lg leading-none">Linkie</p>
        <p className="text-gray-500 text-[10px] mt-0.5">
          Xóa nhòa khoảng cách giữa sân khấu và khán giả.
        </p>
      </footer>
    </div>
  );
}

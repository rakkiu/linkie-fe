import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { eventService, type PublicEvent, getEventStatus } from '../services/eventService';
import logoLinkie from '../image/Linkie.png';

export default function EventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventService.getAllEvents('Active');
        // Sort: Live first, then Upcoming
        const sorted = [...data].sort((a, b) => {
          const statusA = getEventStatus(a);
          const statusB = getEventStatus(b);
          if (statusA === 'live' && statusB !== 'live') return -1;
          if (statusA !== 'live' && statusB === 'live') return 1;
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });
        setEvents(sorted);
      } catch (err) {
        console.error('Failed to fetch events', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const formatDate = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getYear = (isoStr: string) => new Date(isoStr).getFullYear();

  return (
    <div className="min-h-screen bg-[#0f1221] text-white pt-20 pb-20 overflow-x-hidden">
      <Navbar />

      <div className="max-w-xl mx-auto px-6">
        <header className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-4 text-white hover:opacity-70 transition-opacity"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <h1 className="text-[32px] font-bold leading-tight tracking-tight">
              Sự kiện
            </h1>
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
            <p className="text-gray-400">Hiện chưa có sự kiện nào.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {events.map((event) => {
              const status = getEventStatus(event);
              const fallbackImage = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&w=800&q=80';
              
              return (
                <div
                  key={event.id}
                  onClick={() => status === 'live' && navigate(`/events/${event.id}`)}
                  className={`relative group rounded-[32px] overflow-hidden border transition-all duration-300 ${
                    status === 'live'
                      ? 'border-teal-500/30 hover:border-teal-400 cursor-pointer shadow-xl shadow-teal-500/10'
                      : 'border-white/5 opacity-80 cursor-not-allowed'
                  }`}
                >
                  {/* Status Badge */}
                  <div className="absolute top-4 left-4 z-20">
                    {status === 'live' ? (
                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-teal-500/30">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white">Đang diễn ra</span>
                      </div>
                    ) : (
                      <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Sắp diễn ra</span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className="h-56 overflow-hidden">
                    <img
                      src={event.thumbnailUrl || fallbackImage}
                      alt={event.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f1221] via-[#0f1221]/40 to-transparent" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex justify-between items-end">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-1">
                          {getYear(event.startTime)}
                        </p>
                        <h3 className="text-xl font-black text-white leading-tight uppercase truncate">
                          {event.name}
                        </h3>
                        <p className="text-gray-400 text-xs mt-1 font-medium">{formatDate(event.startTime)}</p>
                      </div>
                      
                      {status === 'live' && (
                        <div className="w-10 h-10 rounded-2xl bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-[#0a0a1a] border-t border-white/5 py-3 text-center z-40">
        <img src={logoLinkie} alt="Linkie" className="h-6 w-auto mx-auto" />
        <p className="text-gray-500 text-[10px] mt-0.5">
          Xóa nhòa khoảng cách giữa sân khấu và khán giả.
        </p>
      </footer>
    </div>
  );
}

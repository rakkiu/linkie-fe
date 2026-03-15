import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { eventService, type PublicEvent, getEventStatus } from '../services/eventService';

export default function EventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventService.getAllEvents();
        // Sort: Live first, then Upcoming, then Past
        const sorted = [...data].sort((a, b) => {
          const statusA = getEventStatus(a);
          const statusB = getEventStatus(b);
          const order = { live: 0, upcoming: 1, past: 2 };
          return order[statusA] - order[statusB];
        });
        setEvents(sorted);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filteredEvents = events.filter(ev => {
    if (filter === 'all') return true;
    return getEventStatus(ev) === filter;
  });

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    const month = d.getMonth() + 1;
    const day = String(d.getDate()).padStart(2, '0');
    return { month: `Tháng ${month}`, day };
  };

  const getYear = (isoStr: string) => new Date(isoStr).getFullYear();

  return (
    <div className="min-h-screen bg-[#0f1221] text-white pt-20 pb-12 overflow-x-hidden">
      <Navbar />

      <div className="max-w-xl mx-auto px-6">
        {/* Header section */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Sự kiện</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setFilter('all')}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${filter === 'all' ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/20' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setFilter('live')}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${filter === 'live' ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/20' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}
          >
            Đang diễn ra
          </button>
          <button 
            onClick={() => setFilter('upcoming')}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${filter === 'upcoming' ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/20' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'}`}
          >
            Sắp diễn ra
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-4" />
            <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Đang tải sự kiện</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-20 text-center bg-white/5 border border-white/10 rounded-3xl">
            <p className="text-4xl mb-4">🎫</p>
            <p className="text-white/40 italic">Không có sự kiện nào được tìm thấy.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredEvents.map(ev => {
              const status = getEventStatus(ev);
              const { month, day } = formatDate(ev.startTime);
              
              return (
                <div 
                  key={ev.id}
                  onClick={() => navigate(`/events/${ev.id}`)}
                  className={`relative group cursor-pointer overflow-hidden rounded-[32px] border transition-all duration-500 shadow-2xl ${
                    status === 'live' ? 'border-teal-500/50 hover:border-teal-400' : 'border-white/10 hover:border-white/30'
                  }`}
                  style={{ aspectRatio: '16/10' }}
                >
                  {/* Thumbnail Background */}
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={ev.thumbnailUrl || ''} 
                      alt={ev.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
                  </div>

                  {/* Top Badge */}
                  <div className="absolute top-5 left-5 z-10">
                    {status === 'live' ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00bcd4] rounded-lg shadow-lg">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#0a0a1a]">Đang diễn ra</span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#0a0a1a]">Sắp diễn ra</span>
                      </div>
                    )}
                  </div>

                  {/* Date Box */}
                  <div className="absolute bottom-10 right-5 z-10 w-20 flex flex-col items-center rounded-2xl bg-[#1a1b2e]/80 backdrop-blur-md border border-white/10 p-2 shadow-2xl">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter mb-1">{month}</span>
                    <span className="text-3xl font-black text-white leading-none">{day}</span>
                  </div>

                  {/* Event Info */}
                  <div className="absolute bottom-10 left-8 z-10 pr-24">
                    <h2 className="text-xl font-black uppercase leading-tight mb-1 group-hover:text-teal-400 transition-colors tracking-tight break-words">
                      {ev.name}
                    </h2>
                    <span className="text-sm font-bold text-white/40 tracking-[0.2em]">
                      {getYear(ev.startTime)}
                    </span>
                  </div>

                  {/* Inner Glow Border */}
                  <div className="absolute inset-0 rounded-[32px] border-[1.5px] border-teal-500/0 group-hover:border-teal-400/40 pointer-events-none transition-all duration-500" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="mt-20 flex flex-col items-center">
        <div className="bg-[#1a1b2e]/60 backdrop-blur-lg border border-white/10 rounded-[32px] px-12 py-8 flex flex-col items-center max-w-sm w-full mx-auto">
           <div className="text-4xl font-black tracking-tighter mb-2 bg-gradient-to-r from-teal-400 via-white to-pink-500 bg-clip-text text-transparent">Linkie</div>
           <p className="text-[10px] text-white/40 uppercase tracking-[0.1em] font-medium">Xóa nhòa khoảng cách giữa sân khấu và khán giả.</p>
        </div>
      </div>
    </div>
  );
}

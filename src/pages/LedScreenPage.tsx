import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createWishwallConnection, wishwallApi } from '../services/wishwallService';
import { eventService, type PublicEvent, getEventStatus } from '../services/eventService';
import { useAuth } from '../context/AuthContext';
import type { LedDisplayMessage } from '../types/wishwall';

interface DisplayMessageWithTime extends LedDisplayMessage {
  addedAt: number;
  colIndex: number;
}

export default function LedScreenPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // ── Event picker switcher state ─────────────────────────────────────────────
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [ongoingEvents, setOngoingEvents] = useState<PublicEvent[]>([]);
  const [messages, setMessages] = useState<DisplayMessageWithTime[]>([]);
  const [activeFlashId, setActiveFlashId] = useState<string | null>(null);
  const [currentEvent, setCurrentEvent] = useState<PublicEvent | null>(null);
  const [ledDuration, setLedDuration] = useState<number>(30); // Default 30s
  const [isShattering, setIsShattering] = useState<boolean>(false);
  const [isCleared, setIsCleared] = useState<boolean>(false);

  const connRef = useRef<ReturnType<typeof createWishwallConnection> | null>(null);

  // ── Fetch live events for picker switcher ──────────────────────────────────
  useEffect(() => {
    if (!showEventPicker && eventId) return;
    eventService.getAllEvents('Active')
      .then(data => {
        const liveEvents = data.filter(ev => getEventStatus(ev) === 'live');
        setOngoingEvents(liveEvents);
      })
      .catch(() => {});
  }, [showEventPicker, eventId]);

  useEffect(() => {
    if (eventId) {
      eventService.getEventById(eventId)
        .then(ev => setCurrentEvent(ev))
        .catch(() => {});
    }
  }, [eventId]);

  // ── Fetch latest messages ────────────────────────────────────────────────────
  const fetchLatestMessages = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await wishwallApi.getMessages(eventId);
      const data = res.data?.data || [];
      if (data.length === 0) return;

      // Map with current time as addedAt and balanced random colIndex
      const mapped = data.slice(0, 10).map((m: LedDisplayMessage, idx: number) => ({
        ...m,
        addedAt: Date.now(),
        colIndex: idx % 3 // Distribute evenly initially
      }));
      // Shuffle the colIndex assignments so it doesn't look like a strict pattern
      for (let i = mapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = mapped[i].colIndex;
        mapped[i].colIndex = mapped[j].colIndex;
        mapped[j].colIndex = temp;
      }
      setMessages(mapped);
    } catch (err) {
      console.error('Failed to load initial wishwall messages:', err);
    }
  }, [eventId]);

  // ── Initial load of approved messages ──────────────────────────────────────
  useEffect(() => {
    fetchLatestMessages();
  }, [fetchLatestMessages]);

  // ── Auto-refill when empty ──────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0 && !isShattering && !isCleared && eventId) {
      const timer = setTimeout(() => {
        fetchLatestMessages();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isShattering, isCleared, eventId, fetchLatestMessages]);

  // ── Auto-cleanup of expired messages ───────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setMessages(prev => {
        const filtered = prev.filter(m => now - m.addedAt < ledDuration * 1000);
        if (filtered.length !== prev.length) {
          return filtered;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [ledDuration]);

  // ── SignalR Setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;

    const conn = createWishwallConnection();
    connRef.current = conn;

    conn.start().then(() => conn.invoke('JoinLed', eventId).catch(() => {}));
    
    conn.on('LedDisplay', (payload: LedDisplayMessage) => {
      setIsCleared(false); // Reset clear state when new message arrives
      setMessages(prev => {
        if (prev.some(m => m.id === payload.id)) {
          return prev;
        }
        // Find the column(s) with the fewest items to keep it balanced but random
        const colCounts = [0, 0, 0];
        prev.forEach(m => colCounts[m.colIndex]++);
        const minCount = Math.min(...colCounts);
        const availableCols = [0, 1, 2].filter(c => colCounts[c] === minCount);
        const randomCol = availableCols[Math.floor(Math.random() * availableCols.length)];

        // Insert new message at the top and limit to 10
        const newMessage: DisplayMessageWithTime = {
          ...payload,
          addedAt: Date.now(),
          colIndex: randomCol
        };
        return [newMessage, ...prev].slice(0, 10);
      });
      
      // Flash new message
      setActiveFlashId(payload.id);
      setTimeout(() => setActiveFlashId(null), 1000);
    });

    conn.on('LedClear', () => {
      console.log('SignalR LedClear received - triggering shatter effect...');
      setIsCleared(true); // Prevent auto-refill
      setIsShattering(true);
      setTimeout(() => {
        setMessages([]);
        setIsShattering(false);
      }, 1200); // Shatter animation duration
    });

    conn.on('LedDurationChanged', (duration: number) => {
      console.log('SignalR LedDurationChanged received:', duration);
      setLedDuration(duration);
    });

    return () => {
      conn.invoke('LeaveLed', eventId).catch(() => {});
      conn.stop();
      connRef.current = null;
    };
  }, [eventId]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEventPicker(prev => !prev);
      } else if (e.key === 'q' || e.key === 'Q') {
        logout();
        navigate('/login');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [logout, navigate]);

  // ── Random glowing highlight interaction (fallback if no live messages) ────
  useEffect(() => {
    if (messages.length === 0) return;
    
    const interval = setInterval(() => {
      if (activeFlashId) return; // Don't interrupt real flashes
      const randomIdx = Math.floor(Math.random() * messages.length);
      const targetMsg = messages[randomIdx];
      if (targetMsg) {
        setActiveFlashId(targetMsg.id);
        setTimeout(() => {
          setActiveFlashId(null);
        }, 500);
      }
    }, 4000);
    
    return () => clearInterval(interval);
  }, [messages, activeFlashId]);

  return (
    <div className="bg-[#0d1117] text-[#e5e2e1] h-screen overflow-hidden flex flex-col selection:bg-[#00e5ff]/30 relative font-['Inter']">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        body {
          background-color: #0d1117;
          color: #e5e2e1;
          overflow: hidden;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, filter 0.3s ease;
          display: inline-flex;
          flex-direction: column;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 24px;
          break-inside: avoid;
          box-sizing: border-box;
        }

        .cyan-glow {
          box-shadow: 0 0 20px -5px rgba(0, 229, 255, 0.2);
          border-left: 4px solid #00e5ff;
        }

        .pink-glow {
          box-shadow: 0 0 40px -10px rgba(236, 72, 153, 0.6);
          border-top: 4px solid #ec4899;
          background: rgba(236, 72, 153, 0.05);
        }

        .live-pulse {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 229, 255, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 229, 255, 0); }
        }

        /* ── Slide Down entry for new messages ──────────────────────────────── */
        .slide-down-entry {
          animation: slideDown 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, float 6s ease-in-out infinite 0.8s;
        }

        .floating-anim {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }

        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-80px) scale(0.92);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ── Shatter / Disintegration animation ────────────────────────────── */
        .shattering-card-odd {
          animation: shatter-odd 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards !important;
          pointer-events: none;
        }

        .shattering-card-even {
          animation: shatter-even 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards !important;
          pointer-events: none;
        }

        @keyframes shatter-odd {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
            opacity: 1;
          }
          30% {
            transform: translateY(-8px) scale(0.98) rotate(3deg);
            clip-path: polygon(0% 0%, 45% 10%, 100% 0%, 95% 55%, 100% 100%, 55% 95%, 0% 100%, 5% 45%);
            opacity: 0.8;
          }
          100% {
            transform: translateY(350px) scale(0.1) rotate(38deg);
            clip-path: polygon(25% 35%, 45% 20%, 75% 45%, 60% 70%, 30% 65%);
            opacity: 0;
            filter: blur(3px);
          }
        }

        @keyframes shatter-even {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
            opacity: 1;
          }
          30% {
            transform: translateY(-8px) scale(0.98) rotate(-3deg);
            clip-path: polygon(0% 0%, 55% 8%, 100% 0%, 90% 45%, 100% 100%, 45% 90%, 0% 100%, 8% 55%);
            opacity: 0.8;
          }
          100% {
            transform: translateY(330px) scale(0.1) rotate(-38deg);
            clip-path: polygon(15% 25%, 55% 15%, 85% 55%, 50% 80%, 20% 55%);
            opacity: 0;
            filter: blur(3px);
          }
        }

        .wall-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
          height: 100%;
          padding-top: 24px;
          padding-bottom: 24px;
        }

        .featured-badge {
          background: linear-gradient(90deg, #ec4899, #6e208c);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
      `}</style>

      {/* Ambient Background Effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent"></div>
      </div>

      {/* Event Picker Overlay */}
      {showEventPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowEventPicker(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl px-5 pt-4 pb-8 max-h-[60vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            <h2 className="text-white font-bold text-base mb-4">Chọn sự kiện</h2>
            {ongoingEvents.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">Không có sự kiện nào đang diễn ra.</p>
            ) : (
              <ul className="space-y-2">
                {ongoingEvents.map(ev => (
                  <li key={ev.id}>
                    <button
                      onClick={() => {
                        setShowEventPicker(false);
                        navigate(`/events/${ev.id}/wishwall/led`);
                      }}
                      className={`w-full text-left rounded-2xl px-4 py-3 transition border ${
                        ev.id === eventId
                          ? 'bg-teal-500/20 border-teal-500/50 text-white'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-teal-500/50 text-white'
                      }`}
                    >
                      <p className="font-semibold text-sm">{ev.name}</p>
                      {ev.location && (
                        <p className="text-white/40 text-xs mt-0.5">{ev.location}</p>
                      )}
                      {ev.id === eventId && (
                        <p className="text-teal-400 text-xs mt-0.5 font-medium">● Đang hiển thị</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      {!eventId ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 mt-16 max-w-2xl mx-auto w-full z-10">
          <h1 className="text-3xl font-bold text-white mb-2 text-center uppercase tracking-wider font-['Outfit']">Wishwall Live Display</h1>
          <p className="text-[#bbc9cf] mb-10 text-center text-sm">Chọn sự kiện đang diễn ra để hiển thị các lời chúc.</p>

          {ongoingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-3xl w-full">
              <p className="text-6xl mb-4">📭</p>
              <p className="text-white/30 italic text-sm">Không có sự kiện nào đang diễn ra.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 w-full">
              {ongoingEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => navigate(`/events/${ev.id}/wishwall/led`)}
                  className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#00e5ff] rounded-3xl p-6 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-lg group-hover:text-[#00e5ff] transition-colors uppercase tracking-wider font-['Outfit']">{ev.name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        {ev.location && (
                          <div className="flex items-center gap-1.5 text-white/40 text-sm">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            <span>{ev.location}</span>
                          </div>
                        )}
                        <span className="flex items-center gap-1.5 text-[#00e5ff] text-xs font-bold uppercase tracking-widest">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
                          LIVE
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <main className="relative z-10 px-[24px] max-w-[1440px] mx-auto pt-[12px] flex-1 overflow-visible h-screen w-full flex flex-col">
          {/* TopNavBar */}
          <div className="flex justify-between items-center w-full pt-[24px] border-b border-white/5 pb-[12px] shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-['Outfit'] text-[24px] leading-[32px] font-bold bg-gradient-to-r from-[#ec4899] to-[#00e5ff] bg-clip-text text-transparent tracking-tighter">
                Linkie
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00e5ff] live-pulse"></span>
              <span className="font-['Inter'] text-[12px] leading-[16px] text-[#bbc9cf] uppercase tracking-widest font-semibold">
                {currentEvent?.name || 'Loading Event...'}
              </span>
            </div>
          </div>

          {/* Grid Container */}
          <div className="flex-1 mt-[24px] pb-[80px] overflow-visible">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/20">
                {/* No messages */}
              </div>
            ) : (
              <div className="wall-grid">
                {[0, 1, 2].map(colIdx => (
                  <div key={colIdx} className="flex flex-col gap-[24px]">
                    {messages.filter(m => m.colIndex === colIdx).map((msg, idx) => {
                      const isPositive = msg.sentiment === 'Positive';
                      const isFeatured = isPositive && idx % 3 === 0; // Simulate featured logic if needed
                      
                      const animDelay = `${-((idx * 1.4) % 6)}s`;
                      const isFlashed = activeFlashId === msg.id;

                      // Determine entry and shatter animation classes
                      let animClass = 'floating-anim';
                      const now = Date.now();
                      if (now - msg.addedAt < 2000) {
                        animClass = 'slide-down-entry';
                      }

                      let shatterClass = '';
                      if (isShattering) {
                        shatterClass = idx % 2 === 0 ? 'shattering-card-even' : 'shattering-card-odd';
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`glass-card ${isFeatured ? 'pink-glow' : 'cyan-glow'} rounded-[24px] ${animClass} ${shatterClass} ${isFeatured ? 'p-[20px]' : 'p-[24px]'} ${isFlashed ? 'brightness-150 scale-[1.05] shadow-[0_0_20px_rgba(0,229,255,0.7)]' : ''}`}
                          style={{ animationDuration: '8s', transformOrigin: 'center', animationDelay: animClass === 'slide-down-entry' ? '0s' : animDelay }}
                          onMouseMove={(e) => {
                            if (isShattering) return;
                            const card = e.currentTarget;
                            const rect = card.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            const centerX = rect.width / 2;
                            const centerY = rect.height / 2;
                            const rotateX = (y - centerY) / 30;
                            const rotateY = (centerX - x) / 30;
                            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
                          }}
                          onMouseLeave={(e) => {
                            if (isShattering) return;
                            e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
                          }}
                        >
                          {isFeatured ? (
                            <>
                              <div>
                                <div className="flex justify-between items-start mb-[24px]">
                                  <span className="featured-badge text-[10px] font-bold px-2 py-1 rounded text-white flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">star</span> Featured
                                  </span>
                                  <span className="material-symbols-outlined text-[#ec4899]">favorite</span>
                                </div>
                                <p className="font-['Outfit'] text-[20px] leading-[28px] font-semibold text-white leading-tight">"{msg.message}"</p>
                              </div>
                              <div className="flex items-center gap-[12px] mt-[24px]">
                                <div className="w-10 h-10 rounded-full border-2 border-[#ec4899] p-[2px]">
                                  <img className="w-full h-full object-cover rounded-full" src={`https://ui-avatars.com/api/?name=${encodeURIComponent(msg.userName)}&background=0d1117&color=ec4899`} alt={msg.userName} />
                                </div>
                                <div>
                                  <p className="font-['Inter'] text-[12px] leading-[16px] font-semibold text-white">{msg.userName}</p>
                                  <p className="text-[10px] text-[#ec4899] uppercase tracking-tighter">VIP Attendee</p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="font-['Inter'] text-[18px] leading-[28px] font-normal text-[#e5e2e1]">"{msg.message}"</p>
                              <div className="flex items-center justify-between mt-[24px] border-t border-white/5 pt-[12px]">
                                <p className="font-['Inter'] text-[12px] leading-[16px] font-semibold text-[#bbc9cf]">— {msg.userName}</p>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}



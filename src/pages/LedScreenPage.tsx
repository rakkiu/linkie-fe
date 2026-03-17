import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createWishwallConnection } from '../services/wishwallService';
import { eventService, type PublicEvent, getEventStatus } from '../services/eventService';
import { useAuth } from '../context/AuthContext';
import type { LedDisplayMessage } from '../types/wishwall';

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD_W = 300;
const CARD_H = 140;       // estimated card height for bounce boundary
const HEADER_H = 64;      // header bar height in px
const LIFETIME_MS = 12000; // time before fade starts
const FADE_MS = 3000;      // fade-out duration
const TOTAL_MS = LIFETIME_MS + FADE_MS;
const BASE_SPEED = 1.5;   // pixels per frame

// ── Types ─────────────────────────────────────────────────────────────────────

interface PhysicsItem extends LedDisplayMessage {
  key: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
}

const SENTIMENT_GLOW: Record<string, string> = {
  Positive: 'shadow-green-500/40',
  Neutral: 'shadow-teal-400/30',
  Negative: 'shadow-rose-500/40',
};

const SENTIMENT_BORDER: Record<string, string> = {
  Positive: 'border-green-500/50',
  Neutral: 'border-teal-400/40',
  Negative: 'border-rose-500/50',
};

const SENTIMENT_TEXT: Record<string, string> = {
  Positive: 'text-green-300',
  Neutral: 'text-teal-300',
  Negative: 'text-rose-300',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function LedScreenPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // ── Event switcher state ───────────────────────────────────────────────────
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [ongoingEvents, setOngoingEvents] = useState<PublicEvent[]>([]);
  const [currentEventName, setCurrentEventName] = useState<string>('');

  useEffect(() => {
    if (!eventId) return;
    eventService.getEventById(eventId)
      .then(data => setCurrentEventName(data.name || ''))
      .catch(() => {});
  }, [eventId]);

  useEffect(() => {
    // Luôn fetch nếu không có eventId (trang picker chính) 
    // HOẶC nếu đang mở modal switcher
    if (!showEventPicker && eventId) return;
    
    eventService.getAllEvents('Active')
      .then(data => {
        const liveEvents = data.filter(ev => getEventStatus(ev) === 'live');
        setOngoingEvents(liveEvents);
      })
      .catch(() => {});
  }, [showEventPicker, eventId]);

  // React state only drives mount/unmount; physics runs via direct DOM updates
  const [items, setItems] = useState<PhysicsItem[]>([]);
  const physicsRef = useRef<PhysicsItem[]>([]);
  const cardElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const connRef = useRef<ReturnType<typeof createWishwallConnection> | null>(null);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const addItem = useCallback((msg: LedDisplayMessage) => {
    const W = containerRef.current?.clientWidth ?? window.innerWidth;
    const H = containerRef.current?.clientHeight ?? window.innerHeight;
    const x = Math.random() * Math.max(0, W - CARD_W);
    const y = HEADER_H + Math.random() * Math.max(0, H - HEADER_H - CARD_H);
    const angle = Math.random() * 2 * Math.PI;
    const speed = BASE_SPEED * (0.8 + Math.random() * 0.5);

    const item: PhysicsItem = {
      ...msg,
      key: `${msg.id}-${Date.now()}`,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      born: Date.now(),
    };
    physicsRef.current = [...physicsRef.current, item];
    setItems(prev => [...prev, item]);
  }, []);

  // ── Animation loop: direct DOM mutation for 60fps, setState only on removal ──
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const W = containerRef.current?.clientWidth ?? window.innerWidth;
      const H = containerRef.current?.clientHeight ?? window.innerHeight;
      const dead: string[] = [];

      physicsRef.current = physicsRef.current.map(p => {
        const age = now - p.born;
        if (age >= TOTAL_MS) { dead.push(p.key); return p; }

        let { x, y, vx, vy } = p;
        x += vx; y += vy;

        // Bounce off walls
        if (x <= 0)           { x = 0;           vx = Math.abs(vx); }
        else if (x + CARD_W >= W) { x = W - CARD_W; vx = -Math.abs(vx); }
        if (y <= HEADER_H)         { y = HEADER_H;   vy = Math.abs(vy); }
        else if (y + CARD_H >= H)  { y = H - CARD_H; vy = -Math.abs(vy); }

        const opacity = age < LIFETIME_MS
          ? 1
          : 1 - (age - LIFETIME_MS) / FADE_MS;

        // Directly update DOM — no React re-render needed
        const el = cardElsRef.current.get(p.key);
        if (el) {
          el.style.transform = `translate(${x}px, ${y}px)`;
          el.style.opacity = `${opacity}`;
        }

        return { ...p, x, y, vx, vy };
      });

      if (dead.length > 0) {
        physicsRef.current = physicsRef.current.filter(p => !dead.includes(p.key));
        setItems(prev => prev.filter(p => !dead.includes(p.key)));
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── SignalR ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;

    const conn = createWishwallConnection();
    connRef.current = conn;

    conn.start().then(() => conn.invoke('JoinLed', eventId).catch(() => {}));
    conn.on('LedDisplay', (payload: LedDisplayMessage) => addItem(payload));

    return () => {
      conn.invoke('LeaveLed', eventId).catch(() => {});
      conn.stop();
      connRef.current = null;
    };
  }, [eventId, addItem]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden select-none"
      style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      {/* Header bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 border-b border-white/10 bg-black/70 backdrop-blur-sm"
        style={{ height: HEADER_H }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl"></span>
          <span className="text-white/80 text-xl font-semibold tracking-wide">Wish Wall</span>
        </div>
        {eventId && (
          <button
            onClick={() => setShowEventPicker(true)}
            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/10 hover:border-white/30 max-w-[240px]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <span className="truncate">{currentEventName || 'Đổi sự kiện'}</span>
          </button>
        )}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-teal-400 text-sm font-medium">LIVE</span>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-xs text-white/50 hover:text-white transition-colors border border-white/10 hover:border-white/30 px-3 py-1 rounded-full"
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Event picker bottom sheet */}
      {showEventPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setShowEventPicker(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full bg-[#0a0a1a] border-t border-white/10 rounded-t-3xl px-5 pt-4 pb-8 max-h-[60vh] overflow-y-auto"
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

      {/* Event picker screen (when no eventId in URL) */}
      {!eventId && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 mt-16 max-w-2xl mx-auto w-full">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">Màn hình LED Wishwall</h1>
          <p className="text-white/40 mb-10 text-center">Chọn sự kiện đang diễn ra để bắt đầu hiển thị các lời chúc.</p>

          {ongoingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-3xl w-full">
              <p className="text-6xl mb-4">📭</p>
              <p className="text-white/30 italic">Không có sự kiện nào đang diễn ra.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 w-full">
              {ongoingEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => navigate(`/events/${ev.id}/wishwall/led`)}
                  className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-500 rounded-3xl p-6 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-lg group-hover:text-teal-400 transition-colors uppercase tracking-wider">{ev.name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        {ev.location && (
                          <div className="flex items-center gap-1.5 text-white/40 text-sm">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span>{ev.location}</span>
                          </div>
                        )}
                        <span className="flex items-center gap-1.5 text-teal-400 text-xs font-bold uppercase tracking-widest">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                          LIVE
                        </span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-teal-500/20 group-hover:text-teal-400 transition-all">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state (when eventId exists but no messages yet) */}
      {eventId && items.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-white/20">
          <p className="text-6xl mb-4"></p>
          <p className="text-xl">Waiting for messages…</p>
        </div>
      )}

      {/* Floating bouncing cards */}
      {items.map(item => (
        <MessageCard key={item.key} item={item} cardElsRef={cardElsRef} />
      ))}
    </div>
  );
}

// ── MessageCard ───────────────────────────────────────────────────────────────

function MessageCard({
  item,
  cardElsRef,
}: {
  item: PhysicsItem;
  cardElsRef: React.MutableRefObject<Map<string, HTMLDivElement>>;
}) {
  const glow = SENTIMENT_GLOW[item.sentiment] ?? 'shadow-white/10';
  const border = SENTIMENT_BORDER[item.sentiment] ?? 'border-white/20';
  const sentimentText = SENTIMENT_TEXT[item.sentiment] ?? 'text-slate-300';

  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) cardElsRef.current.set(item.key, el);
      else cardElsRef.current.delete(item.key);
    },
    [item.key, cardElsRef],
  );

  return (
    <div
      ref={ref}
      className={`absolute top-0 left-0 rounded-2xl border p-5 bg-white/5 backdrop-blur-sm shadow-2xl ${glow} ${border}`}
      style={{
        width: CARD_W,
        transform: `translate(${item.x}px, ${item.y}px)`,
        willChange: 'transform, opacity',
      }}
    >
      <p className="text-white text-lg leading-relaxed mb-3 font-light">{item.message}</p>

      <div className="flex items-center justify-between">
        <span className="text-white/50 text-sm font-medium truncate max-w-[60%]">
          — {item.userName}
        </span>
        <span className={`text-xs font-semibold uppercase tracking-wide ${sentimentText}`}>
          {item.sentiment}
        </span>
      </div>
    </div>
  );
}

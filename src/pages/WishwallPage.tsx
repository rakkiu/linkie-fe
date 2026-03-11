import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axiosInstance from '../lib/axios';
import { wishwallApi, createWishwallConnection } from '../services/wishwallService';
import type { WishwallMessage, WishwallPendingMessage } from '../types/wishwall';

// ── Bubble model ─────────────────────────────────────────────────────────────

interface Bubble {
  id: string;        // message guid (or temp id for optimistic bubble)
  text: string;
  x: number;         // percentage 10–65
  startY: number;
  isPending: boolean; // true = waiting for approval (dim style)
}

interface OngoingEvent {
  id: string;
  name: string;
  location?: string;
}

export default function WishwallPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [liked, setLiked] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const connRef = useRef<ReturnType<typeof createWishwallConnection> | null>(null);

  // ── Event switcher state ───────────────────────────────────────────────────
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [ongoingEvents, setOngoingEvents] = useState<OngoingEvent[]>([]);
  const [currentEventName, setCurrentEventName] = useState<string>('');

  // Fetch ongoing events when picker opens
  useEffect(() => {
    if (!showEventPicker) return;
    axiosInstance
      .get<{ data: OngoingEvent[] }>('/api/events?status=Ongoing')
      .then(res => setOngoingEvents((res.data as { data: OngoingEvent[] }).data ?? []))
      .catch(() => {});
  }, [showEventPicker]);

  // Fetch current event name on mount
  useEffect(() => {
    if (!eventId) return;
    axiosInstance
      .get<{ data: { name: string } }>(`/api/events/${eventId}`)
      .then(res => setCurrentEventName((res.data as { data: { name: string } }).data?.name ?? ''))
      .catch(() => {});
  }, [eventId]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const spawnBubble = useCallback((msg: { id: string; message: string }, isPending: boolean) => {
    setBubbles(prev => [
      ...prev,
      {
        id: msg.id,
        text: msg.message,
        x: 10 + Math.random() * 55,
        startY: 60 + Math.random() * 20,
        isPending,
      },
    ]);
  }, []);

  const removeBubble = useCallback((id: string) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
  }, []);

  // ── On mount: load history + connect SignalR ───────────────────────────────

  useEffect(() => {
    if (!eventId) return;

    // 1. Load last 10 approved messages as initial bubbles
    wishwallApi.getMessages(eventId).then((res: { data: { data: WishwallMessage[] } }) => {
      const messages: WishwallMessage[] = res.data.data ?? [];
      messages.slice(0, 10).forEach(m =>
        spawnBubble({ id: m.id, message: m.message }, false),
      );
    }).catch(() => { /* non-critical */ });

    // 2. Set up SignalR
    const conn = createWishwallConnection();
    connRef.current = conn;

    // Approved message → show bubble for everyone in this event
    conn.on('MessageApproved', (msg: WishwallMessage) => {
      spawnBubble({ id: msg.id, message: msg.message }, false);
    });

    // Pending confirm → sent only to the author; bubble already shown optimistically
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    conn.on('MessagePending', (_msg: WishwallPendingMessage) => {
      // Could show a toast: "Tin nhắn đang chờ duyệt"
    });

    conn.start()
      .then(() => conn.invoke('JoinEvent', eventId))
      .catch(err => console.warn('SignalR connection failed:', err));

    return () => {
      conn.invoke('LeaveEvent', eventId).catch(() => {});
      conn.stop();
    };
  }, [eventId, spawnBubble]);

  // ── Send message ───────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !eventId || sending) return;

    const tempId = `temp-${Date.now()}`;
    spawnBubble({ id: tempId, message: text }, true);
    setInput('');
    setSending(true);
    inputRef.current?.focus();

    try {
      await wishwallApi.sendMessage(eventId, text);
    } catch (err) {
      removeBubble(tempId);
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  }, [input, eventId, sending, spawnBubble, removeBubble]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="bg-[#0d1117] min-h-screen text-white flex flex-col">
      <Navbar />

      {/* ── Header ─────────────────────────────────── */}
      <div className="pt-16 px-5 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white mb-1 hover:opacity-70 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-base font-bold">Wishwall</span>
        </button>
        <p className="text-gray-400 text-sm pl-6">Sự kiện</p>
      </div>

      {/* ── Event info card ─────────────────────────── */}
      <div className="mx-4 mt-2 mb-1 bg-[#141b2d] rounded-2xl px-4 py-3 flex items-start justify-between">
        <div>
          <p className="text-white font-bold text-sm truncate max-w-[220px]">{currentEventName || 'Wishwall'}</p>
          <div className="flex items-center gap-4 mt-1.5">
            <span className="flex items-center gap-1 text-gray-400 text-xs">
              {/* Play / view icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              10,000,000
            </span>
            <span className="flex items-center gap-1 text-gray-400 text-xs">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              10,000,000
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <button
            onClick={() => setShowEventPicker(true)}
            className="text-purple-400 hover:text-purple-300 transition-colors"
            title="Đổi sự kiện"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Wishwall bubble area ─────────────────────── */}
      <div className="flex-1 relative overflow-hidden mx-4 mb-1 min-h-[280px]">
        {/* Heart decoration bottom-right */}
        <div className="absolute bottom-4 right-4 opacity-60 pointer-events-none">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <path d="M22 38l-1.6-1.45C10 27.2 4 22.1 4 15.5 4 10.3 8.2 6 13.5 6c2.8 0 5.5 1.3 7.5 3.4C23 7.3 25.7 6 28.5 6 33.8 6 38 10.3 38 15.5c0 6.6-6 11.7-16.4 21.05L22 38z" fill="#e91e8c" opacity="0.4"/>
            <path d="M28 30l-0.9-0.8C21.8 24.5 18 21.4 18 17.8 18 15.1 20.1 13 22.8 13c1.4 0 2.75.65 3.7 1.7C27.45 13.65 28.8 13 30.2 13 32.9 13 35 15.1 35 17.8c0 3.6-3.8 6.7-9.1 11.4L28 30z" fill="#e91e8c" opacity="0.25" transform="translate(-4, 4)"/>
          </svg>
        </div>

        {/* Floating bubbles */}
        {bubbles.map(bubble => (
          <FloatingBubble
            key={bubble.id}
            bubble={bubble}
            onDone={removeBubble}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-white/10 mb-3" />

      {/* ── Input bar ───────────────────────────────── */}
      <div className="mx-4 mb-6 flex items-center gap-2">
        <div className="flex-1 flex items-center bg-[#1e2433] rounded-full px-4 h-11 gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            maxLength={80}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        {/* Like button */}
        <button
          onClick={() => setLiked(l => !l)}
          className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all active:scale-90 ${
            liked
              ? 'bg-[#e91e8c] border-[#e91e8c]'
              : 'bg-transparent border-[#e91e8c]'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'white' : 'none'} stroke={liked ? 'white' : '#e91e8c'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {/* ── Event picker bottom sheet ────────────────── */}
      {showEventPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setShowEventPicker(false)}
        >
          <div
            className="w-full bg-[#141b2d] rounded-t-2xl p-5 max-h-[60vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-bold text-base">Chọn sự kiện</p>
              <button onClick={() => setShowEventPicker(false)} className="text-gray-400 hover:text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            {ongoingEvents.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">Không có sự kiện nào đang diễn ra</p>
            ) : (
              ongoingEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => { setShowEventPicker(false); navigate(`/events/${ev.id}/wishwall`); }}
                  className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-colors ${
                    ev.id === eventId
                      ? 'bg-purple-600/30 border border-purple-500/40'
                      : 'bg-[#1e2433] hover:bg-[#252f45]'
                  }`}
                >
                  <p className="text-white text-sm font-medium">{ev.name}</p>
                  {ev.location && <p className="text-gray-400 text-xs mt-0.5">{ev.location}</p>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Floating bubble sub-component ──────────────────────────────────────────────
interface FloatingBubbleProps {
  bubble: Bubble;
  onDone: (id: string) => void;
}

function FloatingBubble({ bubble, onDone }: FloatingBubbleProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Animate: float up ~260px, fade out over 3.5s
    const anim = el.animate(
      [
        { transform: 'translateY(0px)', opacity: bubble.isPending ? 0.5 : 1 },
        { transform: 'translateY(-80px)', opacity: bubble.isPending ? 0.4 : 0.9, offset: 0.3 },
        { transform: 'translateY(-200px)', opacity: bubble.isPending ? 0.2 : 0.4, offset: 0.75 },
        { transform: 'translateY(-300px)', opacity: 0 },
      ],
      { duration: 3500, easing: 'ease-out', fill: 'forwards' }
    );

    anim.onfinish = () => onDone(bubble.id);
    return () => anim.cancel();
  }, [bubble.id, bubble.isPending, onDone]);

  return (
    <div
      ref={ref}
      className="absolute px-4 py-2 rounded-full text-white text-sm font-medium pointer-events-none"
      style={{
        left: `${bubble.x}%`,
        bottom: `${bubble.startY}px`,
        background: bubble.isPending
          ? 'linear-gradient(135deg, #374151cc, #1f2937cc)'
          : 'linear-gradient(135deg, #0e7490cc, #164e63cc)',
        backdropFilter: 'blur(4px)',
        border: bubble.isPending
          ? '1px solid rgba(156,163,175,0.3)'
          : '1px solid rgba(6,182,212,0.4)',
        maxWidth: '65%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {bubble.text}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { wishwallApi, createWishwallConnection } from '../services/wishwallService';
import { eventService, type PublicEvent, getEventStatus } from '../services/eventService';
import type { PendingWishwallMessage, WishwallStaffPending } from '../types/wishwall';
import { formatToLocalTime } from '../lib/dateUtils';

export default function WishwallModerationPage() {
  const { id: paramEventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // If navigated via /staff/wishwall, paramEventId is undefined → show picker
  const [selectedEventId, setSelectedEventId] = useState<string | null>(paramEventId ?? null);
  const [selectedEventName, setSelectedEventName] = useState<string>('');

  // ── Event picker state ─────────────────────────────────────────────────────
  const [ongoingEvents, setOngoingEvents] = useState<PublicEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(!paramEventId);

  useEffect(() => {
    if (selectedEventId) return; 
    
    eventService.getAllEvents('Active')
      .then(data => {
        const liveEvents = data.filter(ev => getEventStatus(ev) === 'live');
        setOngoingEvents(liveEvents);
      })
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, [selectedEventId]);

  const handleSelectEvent = (ev: PublicEvent) => {
    setSelectedEventName(ev.name);
    setSelectedEventId(ev.id);
  };

  // ── Pending messages state ─────────────────────────────────────────────────
  const [messages, setMessages] = useState<PendingWishwallMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const connRef = useRef<ReturnType<typeof createWishwallConnection> | null>(null);

  // ── Load pending messages ──────────────────────────────────────────────────
  const loadPending = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await wishwallApi.getPendingMessages(selectedEventId);
      const data: PendingWishwallMessage[] = (res.data as { data: PendingWishwallMessage[] }).data ?? [];
      // Sort oldest first
      const sortedData = [...data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(sortedData);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // ── SignalR: receive new pending messages in real-time ─────────────────────
  useEffect(() => {
    if (!selectedEventId) return;

    const conn = createWishwallConnection();
    connRef.current = conn;

    conn.start().then(() => {
      conn.invoke('JoinStaff', selectedEventId).catch(() => {});
    });

    conn.on('NewPendingMessage', (payload: WishwallStaffPending) => {
      setMessages(prev => {
        if (prev.some(m => m.id === payload.id)) return prev;
        return [
          ...prev,
          {
            id: payload.id,
            userId: '',
            userName: '(loading)',
            message: payload.message,
            sentiment: payload.sentiment,
            createdAt: payload.createdAt,
          }
        ];
      });
    });

    return () => {
      conn.invoke('LeaveStaff', selectedEventId).catch(() => {});
      conn.stop();
      connRef.current = null;
    };
  }, [selectedEventId]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleDisplay = async (msg: PendingWishwallMessage) => {
    if (!selectedEventId || actionId) return;
    setActionId(`display-${msg.id}`);
    try {
      await wishwallApi.approveMessage(selectedEventId, msg.id);
      await wishwallApi.displayOnLed(selectedEventId, msg.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch {
      // ignore
    } finally {
      setActionId(null);
    }
  };

  const handleReject = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  // ── Event picker screen ────────────────────────────────────────────────────
  if (!selectedEventId) {
    return (
      <div className="min-h-screen bg-black overflow-hidden flex flex-col" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        {/* Header bar */}
        <div className="h-16 flex items-center justify-between px-8 border-b border-white/10 bg-black/70 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-xl font-semibold tracking-wide">Wish Wall Staff</span>
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

        <div className="flex-1 flex flex-col items-center pt-12 p-6 max-w-2xl mx-auto w-full">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">Wishwall Moderation</h1>
          <p className="text-white/40 mb-10 text-center">Chọn sự kiện đang diễn ra để bắt đầu duyệt tin nhắn.</p>

          {eventsLoading ? (
            <p className="text-white/30 text-sm text-center py-8 animate-pulse">Đang tải sự kiện…</p>
          ) : ongoingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-3xl w-full">
              <p className="text-6xl mb-4">📭</p>
              <p className="text-white/30 italic">Không có sự kiện nào đang diễn ra.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 w-full">
              {ongoingEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => handleSelectEvent(ev)}
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
      </div>
    );
  }

  // ── Moderation screen ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header bar */}
      <div className="h-16 flex items-center justify-between px-8 border-b border-white/10 bg-black/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col">
          <span className="text-white/80 text-xl font-semibold tracking-wide">Wishwall Staff</span>
          {selectedEventName && (
            <span className="text-teal-400 text-[10px] font-bold uppercase tracking-widest">{selectedEventName}</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!paramEventId && (
            <button
              onClick={() => {
                setSelectedEventId(null);
                setSelectedEventName('');
                setMessages([]);
                setEventsLoading(true);
              }}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-white transition-colors px-3 py-1 rounded-full border border-white/10 hover:border-white/30"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
              Đổi sự kiện
            </button>
          )}
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-white transition-colors border border-white/10 hover:border-white/30 px-3 py-1 rounded-full"
          >
            LOGOUT
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 w-full">
        {loading ? (
          <p className="text-white/30 text-sm text-center mt-20 animate-pulse uppercase tracking-widest">Đang tải tin nhắn…</p>
        ) : messages.length === 0 ? (
          <div className="text-center mt-20 text-white/20">
            <p className="text-5xl mb-4"></p>
            <p className="text-lg font-medium">Không có tin nhắn chờ duyệt.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map(msg => (
              <li
                key={msg.id}
                className="bg-white/5 border border-white/10 rounded-3xl p-6 transition-all shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-teal-400/90 uppercase tracking-wider">
                        {msg.userName || 'Anonymous'}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          msg.sentiment === 'Positive' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                          msg.sentiment === 'Negative' ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' :
                          'border-white/20 text-white/50 bg-white/5'
                        }`}
                      >
                        {msg.sentiment}
                      </span>
                    </div>
                    <p className="text-white text-lg font-light leading-relaxed">{msg.message}</p>
                  </div>
                  <span className="text-white/20 text-xs font-medium shrink-0">
                    {formatToLocalTime(msg.createdAt)}
                  </span>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button
                    disabled={!!actionId}
                    onClick={() => handleDisplay(msg)}
                    className="flex-1 py-3 rounded-2xl bg-teal-500 text-black text-xs font-bold uppercase tracking-widest hover:bg-teal-400 transition-all disabled:opacity-40"
                  >
                    {actionId === `display-${msg.id}` ? 'Đang đẩy…' : '🖥 Push to LED'}
                  </button>

                  <button
                    disabled={!!actionId}
                    onClick={() => handleReject(msg.id)}
                    className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-rose-400 hover:border-rose-500/50 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

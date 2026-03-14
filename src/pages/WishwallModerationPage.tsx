import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../lib/axios';
import AdminLayout from './admin/AdminLayout';
import { wishwallApi, createWishwallConnection } from '../services/wishwallService';
import type { PendingWishwallMessage, WishwallStaffPending } from '../types/wishwall';

const SENTIMENT_COLOR: Record<string, string> = {
  Positive: 'text-green-400',
  Neutral: 'text-slate-300',
  Negative: 'text-red-400',
};

interface OngoingEvent {
  id: string;
  name: string;
  location?: string;
  startTime: string;
}

export default function WishwallModerationPage() {
  const { id: paramEventId } = useParams<{ id: string }>();

  // If navigated via /staff/wishwall, paramEventId is undefined → show picker
  const [selectedEventId, setSelectedEventId] = useState<string | null>(paramEventId ?? null);
  const [selectedEventName, setSelectedEventName] = useState<string>('');

  // ── Event picker state ─────────────────────────────────────────────────────
  const [ongoingEvents, setOngoingEvents] = useState<OngoingEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(!paramEventId);

  useEffect(() => {
    if (selectedEventId) return; // already have an event
    axiosInstance
      .get<{ data: OngoingEvent[] }>('/api/events?status=Ongoing')
      .then(res => setOngoingEvents((res.data as { data: OngoingEvent[] }).data ?? []))
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, [selectedEventId]);

  const handleSelectEvent = (ev: OngoingEvent) => {
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
      setMessages(data);
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
          {
            id: payload.id,
            userId: '',
            userName: '(loading)',
            message: payload.message,
            sentiment: payload.sentiment,
            createdAt: payload.createdAt,
          },
          ...prev,
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
      <AdminLayout activePage="wishwall-moderation">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'white' }}>Wishwall Moderation</h1>
          <p className="text-slate-400 mb-6 text-sm">Chọn sự kiện đang diễn ra để duyệt tin nhắn.</p>

          {eventsLoading ? (
            <p className="text-slate-400 text-center mt-16">Đang tải sự kiện…</p>
          ) : ongoingEvents.length === 0 ? (
            <div className="text-center mt-16 text-slate-400">
              <p className="text-4xl mb-3">📭</p>
              <p>Không có sự kiện nào đang diễn ra.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {ongoingEvents.map(ev => (
                <li key={ev.id}>
                  <button
                    onClick={() => handleSelectEvent(ev)}
                    className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500 rounded-2xl px-5 py-4 transition"
                  >
                    <p className="font-semibold text-white">{ev.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {ev.location && (
                        <span className="text-slate-400 text-xs">{ev.location}</span>
                      )}
                      <span className="text-xs text-green-400 font-medium">● Đang diễn ra</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AdminLayout>
    );
  }

  // ── Moderation screen ──────────────────────────────────────────────────────
  return (
    <AdminLayout activePage="wishwall-moderation">
      <div className="max-w-3xl mx-auto px-4 py-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Wishwall Moderation</h1>
            {selectedEventName && (
              <p className="text-purple-300 text-sm mt-1">{selectedEventName}</p>
            )}
          </div>
          {/* Allow staff to switch event if they came via /staff/wishwall */}
          {!paramEventId && (
            <button
              onClick={() => {
                setSelectedEventId(null);
                setSelectedEventName('');
                setMessages([]);
                setEventsLoading(true);
              }}
              className="text-xs text-slate-400 hover:text-white underline transition"
            >
              Đổi sự kiện
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-slate-400 text-center mt-20">Đang tải tin nhắn…</p>
        ) : messages.length === 0 ? (
          <div className="text-center mt-20 text-slate-400">
            <p className="text-4xl mb-3"></p>
            <p>Không có tin nhắn chờ duyệt.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map(msg => (
              <li
                key={msg.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-purple-300 truncate">
                        {msg.userName || 'Anonymous'}
                      </span>
                      <span
                        className={`text-xs font-medium ${SENTIMENT_COLOR[msg.sentiment] ?? 'text-slate-400'}`}
                      >
                        {msg.sentiment}
                      </span>
                    </div>
                    <p className="text-white/90 text-sm break-words">{msg.message}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    disabled={!!actionId}
                    onClick={() => handleDisplay(msg)}
                    className="flex-1 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-sm font-semibold transition disabled:opacity-40"
                  >
                    {actionId === `display-${msg.id}` ? 'Đang đẩy…' : '🖥 Push to LED'}
                  </button>

                  <button
                    disabled={!!actionId}
                    onClick={() => handleReject(msg.id)}
                    className="px-4 py-2 rounded-xl bg-red-700/60 hover:bg-red-600 text-sm font-semibold transition disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}

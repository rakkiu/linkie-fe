import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { wishwallApi, createWishwallConnection } from '../services/wishwallService';
import type { PendingWishwallMessage, WishwallStaffPending } from '../types/wishwall';

const SENTIMENT_COLOR: Record<string, string> = {
  Positive: 'text-green-400',
  Neutral: 'text-slate-300',
  Negative: 'text-red-400',
};

export default function WishwallModerationPage() {
  const { id: eventId } = useParams<{ id: string }>();

  const [messages, setMessages] = useState<PendingWishwallMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null); // id of message being actioned
  const connRef = useRef<ReturnType<typeof createWishwallConnection> | null>(null);

  // ── Load pending messages ──────────────────────────────────────────────────
  const loadPending = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await wishwallApi.getPendingMessages(eventId);
      const data: PendingWishwallMessage[] = (res.data as { data: PendingWishwallMessage[] }).data ?? [];
      setMessages(data);
    } catch {
      // silently ignore — toast can be added later
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // ── SignalR: receive new pending messages in real-time ─────────────────────
  useEffect(() => {
    if (!eventId) return;

    const conn = createWishwallConnection();
    connRef.current = conn;

    conn.start().then(() => {
      conn.invoke('JoinStaff', eventId).catch(() => {});
    });

    conn.on('NewPendingMessage', (payload: WishwallStaffPending) => {
      // Add to top of list if not already there
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
      conn.invoke('LeaveStaff', eventId).catch(() => {});
      conn.stop();
      connRef.current = null;
    };
  }, [eventId]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleDisplay = async (msg: PendingWishwallMessage) => {
    if (!eventId || actionId) return;
    setActionId(`display-${msg.id}`);
    try {
      // Approve first if not yet approved (pending messages are unapproved)
      await wishwallApi.approveMessage(eventId, msg.id);
      await wishwallApi.displayOnLed(eventId, msg.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch {
      // ignore
    } finally {
      setActionId(null);
    }
  };

  const handleReject = (id: string) => {
    // Optimistically remove from local list (no delete endpoint yet)
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-20 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Wishwall Moderation</h1>
        </div>

        {loading ? (
          <p className="text-slate-400 text-center mt-20">Loading pending messages…</p>
        ) : messages.length === 0 ? (
          <div className="text-center mt-20 text-slate-400">
            <p className="text-4xl mb-3"></p>
            <p>No pending messages. All clear!</p>
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
                  {/* Approve + push straight to LED */}
                  <button
                    disabled={!!actionId}
                    onClick={() => handleDisplay(msg)}
                    className="flex-1 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-sm font-semibold transition disabled:opacity-40"
                  >
                    {actionId === `display-${msg.id}` ? 'Pushing…' : ' Push to LED'}
                  </button>

                  {/* Reject (local only for now) */}
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
    </div>
  );
}

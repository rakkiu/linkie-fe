import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { createWishwallConnection } from '../services/wishwallService';
import type { LedDisplayMessage, WishwallMessage } from '../types/wishwall';
import { wishwallApi } from '../services/wishwallService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DisplayItem extends LedDisplayMessage {
  key: string; // unique key for animation (id + timestamp)
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

  // Queue of messages to display; newest at index 0
  const [items, setItems] = useState<DisplayItem[]>([]);
  const connRef = useRef<ReturnType<typeof createWishwallConnection> | null>(null);

  const addItem = useCallback((msg: LedDisplayMessage) => {
    const item: DisplayItem = { ...msg, key: `${msg.id}-${Date.now()}` };
    setItems(prev => [item, ...prev].slice(0, 20)); // keep at most 20
  }, []);

  // ── Load recent approved messages on mount ───────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    wishwallApi.getMessages(eventId).then(res => {
      const msgs: WishwallMessage[] = (res.data as any)?.data ?? [];
      msgs.slice(0, 8).reverse().forEach(m =>
        addItem({
          id: m.id,
          userName: m.userName,
          message: m.message,
          sentiment: m.sentiment,
          createdAt: m.createdAt,
        }),
      );
    }).catch(() => {});
  }, [eventId, addItem]);

  // ── SignalR ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;

    const conn = createWishwallConnection();
    connRef.current = conn;

    conn.start().then(() => {
      // Join both event group (approved) and led group (explicit push)
      conn.invoke('JoinEvent', eventId).catch(() => {});
      conn.invoke('JoinLed', eventId).catch(() => {});
    });

    // Receives when organizer clicks "Approve" → shows on all wishwall views
    conn.on('MessageApproved', (payload: LedDisplayMessage) => addItem(payload));

    // Receives when organizer explicitly clicks "Push to LED"
    conn.on('LedDisplay', (payload: LedDisplayMessage) => addItem(payload));

    return () => {
      conn.invoke('LeaveEvent', eventId).catch(() => {});
      conn.invoke('LeaveLed', eventId).catch(() => {});
      conn.stop();
      connRef.current = null;
    };
  }, [eventId, addItem]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-black flex flex-col overflow-hidden select-none"
      style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <span className="text-white/80 text-xl font-semibold tracking-wide">Wish Wall</span>
        </div>
        <span className="text-white/30 text-sm uppercase tracking-widest">Live</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-teal-400 text-sm font-medium">LIVE</span>
        </div>
      </div>

      {/* Message grid */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/20">
            <p className="text-6xl mb-4">✨</p>
            <p className="text-xl">Waiting for messages…</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {items.map((item, idx) => (
              <MessageCard key={item.key} item={item} isNew={idx === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MessageCard ───────────────────────────────────────────────────────────────

function MessageCard({ item, isNew }: { item: DisplayItem; isNew: boolean }) {
  const glow = SENTIMENT_GLOW[item.sentiment] ?? 'shadow-white/10';
  const border = SENTIMENT_BORDER[item.sentiment] ?? 'border-white/20';
  const sentimentText = SENTIMENT_TEXT[item.sentiment] ?? 'text-slate-300';

  return (
    <div
      className={`
        break-inside-avoid rounded-2xl border p-5
        bg-white/5 backdrop-blur-sm
        shadow-2xl ${glow} ${border}
        transition-all duration-700
        ${isNew ? 'animate-fade-in-down' : ''}
      `}
      style={isNew ? { animation: 'fadeInDown 0.6s ease-out' } : {}}
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

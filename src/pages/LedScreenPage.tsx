import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { createWishwallConnection } from '../services/wishwallService';
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
        <span className="text-white/30 text-sm uppercase tracking-widest">Live</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-teal-400 text-sm font-medium">LIVE</span>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
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

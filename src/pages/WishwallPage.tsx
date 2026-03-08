import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

const eventNames: Record<number, string> = {
  1: 'Nights Festival',
  2: 'Fireworks Festival',
};

interface Bubble {
  id: number;
  text: string;
  x: number; // percentage 10–70
  startY: number;
}

let nextId = 1;

export default function WishwallPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventName = eventNames[Number(id)] ?? 'Sự kiện';

  const [input, setInput] = useState('');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [liked, setLiked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Remove bubble after animation ends
  const removeBubble = useCallback((bubbleId: number) => {
    setBubbles(prev => prev.filter(b => b.id !== bubbleId));
  }, []);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const bubble: Bubble = {
      id: nextId++,
      text,
      x: 10 + Math.random() * 55, // random left position 10%–65%
      startY: 60 + Math.random() * 20, // start near bottom of wall area
    };

    setBubbles(prev => [...prev, bubble]);
    setInput('');
    inputRef.current?.focus();
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
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
        <p className="text-gray-400 text-sm pl-6">{eventName}</p>
      </div>

      {/* ── Event info card ─────────────────────────── */}
      <div className="mx-4 mt-2 mb-1 bg-[#141b2d] rounded-2xl px-4 py-3 flex items-start justify-between">
        <div>
          <p className="text-white font-bold text-sm">{eventName}</p>
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
        <button className="text-gray-400 hover:text-white transition-colors mt-0.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
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
            onClick={sendMessage}
            disabled={!input.trim()}
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
    </div>
  );
}

// ── Floating bubble sub-component ──────────────────────────────────────────────
interface FloatingBubbleProps {
  bubble: Bubble;
  onDone: (id: number) => void;
}

function FloatingBubble({ bubble, onDone }: FloatingBubbleProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Animate: float up ~260px, fade out over 3.5s
    const anim = el.animate(
      [
        { transform: 'translateY(0px)', opacity: 1 },
        { transform: 'translateY(-80px)', opacity: 0.9, offset: 0.3 },
        { transform: 'translateY(-200px)', opacity: 0.4, offset: 0.75 },
        { transform: 'translateY(-300px)', opacity: 0 },
      ],
      { duration: 3500, easing: 'ease-out', fill: 'forwards' }
    );

    anim.onfinish = () => onDone(bubble.id);
    return () => anim.cancel();
  }, [bubble.id, onDone]);

  return (
    <div
      ref={ref}
      className="absolute px-4 py-2 rounded-full text-white text-sm font-medium pointer-events-none"
      style={{
        left: `${bubble.x}%`,
        bottom: `${bubble.startY}px`,
        background: 'linear-gradient(135deg, #0e7490cc, #164e63cc)',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(6,182,212,0.4)',
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

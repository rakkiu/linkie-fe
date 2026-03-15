import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { eventService, type PublicEvent } from '../services/eventService';

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

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [liked, setLiked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Fetch Event ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchEvent = async () => {
      try {
        const data = await eventService.getEventById(id);
        setEvent(data);
      } catch {
        // silently fail — loading state handled by finally
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const removeBubble = useCallback((bubbleId: number) => {
    setBubbles(prev => prev.filter(b => b.id !== bubbleId));
  }, []);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const bubble: Bubble = {
      id: nextId++,
      text,
      x: 10 + Math.random() * 55,
      startY: 60 + Math.random() * 20,
    };

    setBubbles(prev => [...prev, bubble]);
    setInput('');
    inputRef.current?.focus();
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  if (loading) {
    return (
      <div className="bg-[#0d1117] min-h-screen text-white flex items-center justify-center">
        <div className="animate-spin text-3xl">⟳</div>
      </div>
    );
  }

  const eventName = event?.name || 'Sự kiện';

  return (
    <div className="bg-[#0d1117] min-h-screen text-white flex flex-col">
      <Navbar />

      {/* ── Header ──────────────────────────────────── */}
      <div className="pt-20 px-6 pb-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(-1)}
            className="mt-1 hover:opacity-70 transition-opacity"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black tracking-tight">{eventName}</h1>
            <p className="text-[#e91e8c] text-sm font-bold mt-0.5">Wishwall</p>
          </div>
        </div>
      </div>

      {/* ── Wishwall bubble area ─────────────────────── */}
      <div className="flex-1 relative overflow-hidden mx-4 mb-1 min-h-[350px]">
        <div className="absolute bottom-4 right-4 opacity-60 pointer-events-none">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <path d="M22 38l-1.6-1.45C10 27.2 4 22.1 4 15.5 4 10.3 8.2 6 13.5 6c2.8 0 5.5 1.3 7.5 3.4C23 7.3 25.7 6 28.5 6 33.8 6 38 10.3 38 15.5c0 6.6-6 11.7-16.4 21.05L22 38z" fill="#e91e8c" opacity="0.4"/>
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

      <div className="mx-4 border-t border-white/10 mb-3" />

      {/* ── Input bar ───────────────────────────────── */}
      <div className="mx-4 mb-8 flex items-center gap-2">
        <div className="flex-1 flex items-center bg-[#1e2433] rounded-full px-4 h-11 gap-2 border border-white/5">
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

function FloatingBubble({ bubble, onDone }: { bubble: Bubble; onDone: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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

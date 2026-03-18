import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { eventService, type PublicEvent } from '../services/eventService';
import { wishwallApi } from '../services/wishwallService';

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

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !id) return;

    // Gửi lên server
    try {
      await wishwallApi.sendMessage(id, text);
      
      const bubble: Bubble = {
        id: nextId++,
        text,
        x: 10 + Math.random() * 55,
        startY: 60 + Math.random() * 20,
      };

      setBubbles(prev => [...prev, bubble]);
      setInput('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
    }
  }, [input, id]);

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
    <div className="bg-[#0d1117] h-[100dvh] w-full text-white relative overflow-hidden flex flex-col">
      {/* ── Navbar (Fixed/Absolute) ────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      {/* ── Header ──────────────────────────────────── */}
      <div className="absolute top-[10dvh] left-0 right-0 px-6 z-10">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(-1)}
            className="mt-1 hover:opacity-70 transition-opacity"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black tracking-tight truncate">{eventName}</h1>
            <p className="text-[#e91e8c] text-xs font-bold">Wishwall</p>
          </div>
        </div>
      </div>

      {/* ── Wishwall bubble area ─────────────────────── */}
      <div className="flex-1 w-full relative overflow-hidden">
        <div className="absolute inset-0">
          {bubbles.map(bubble => (
            <FloatingBubble
              key={bubble.id}
              bubble={bubble}
              onDone={removeBubble}
            />
          ))}
        </div>
      </div>

      {/* ── Input bar (Fixed at bottom) ─────────────── */}
      <div className="shrink-0 w-full bg-[#0d1117] border-t border-white/10 z-20">
        <div className="px-4 py-4 flex items-center gap-2 max-w-xl mx-auto">
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
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center border-2 transition-all active:scale-90 ${
              input.trim()
                ? 'bg-[#e91e8c] border-[#e91e8c] shadow-lg shadow-[#e91e8c]/20'
                : 'bg-transparent border-white/10 opacity-30 cursor-not-allowed'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
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

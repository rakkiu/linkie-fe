import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { eventService, type PublicEvent } from '../services/eventService';
import { wishwallApi, createWishwallConnection } from '../services/wishwallService';

interface Bubble {
  id: string | number;
  text: string;
  x: number; // percentage 10–70
  startY: number;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
}


export default function WishwallPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [history, setHistory] = useState<any[]>([]); // To store recent message objects
  const [isTrayOpen, setIsTrayOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const connRef = useRef<any>(null);

  // ── Fetch Event ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [eventData, messagesRes] = await Promise.all([
          eventService.getEventById(id),
          wishwallApi.getMessages(id)
        ]);
        
        setEvent(eventData);
        
        // Convert existing messages to bubbles and set history
        const existingMessages = (messagesRes.data as any).data || [];
        setHistory(existingMessages);
        
        const initialBubbles: Bubble[] = existingMessages.map((m: any) => ({
          id: m.id,
          text: m.message,
          x: 10 + Math.random() * 55,
          startY: 60 + Math.random() * 20,
          sentiment: m.sentiment
        }));
        setBubbles(initialBubbles);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ── SignalR Setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    let connection: any = null;

    const startConnection = async () => {
      connection = createWishwallConnection();
      // Temporarily lower logging to silence AbortError noise in console
      (connection as any)._logger.log = () => {}; 
      connRef.current = connection;

      try {
        await connection.start();
        if (isMounted) {
          console.log('SignalR Connected to Wishwall Hub');
          await connection.invoke('JoinEvent', id);
        } else {
          await connection.stop().catch(() => {});
        }
      } catch (err: any) {
        // If we are still mounted and it's NOT an intentional stop, log it
        if (isMounted && !err.message?.includes('negotiation') && err.name !== 'AbortError') {
          console.error('SignalR Connection failed:', err);
        }
      }

      if (isMounted && connection.state === 'Connected') {
        connection.on('MessageApproved', (message: any) => {
          console.log('MessageApproved:', message);
          setHistory(prev => {
            if (prev.some(m => m.id === message.id)) {
              return prev.map(m => m.id === message.id ? message : m);
            }
            return [message, ...prev].slice(0, 50);
          });
          
          setBubbles(prev => {
            if (prev.some(b => b.id === message.id)) {
              return prev.map(b => b.id === message.id ? { ...b, sentiment: message.sentiment } : b);
            }
            return [...prev, {
              id: message.id,
              text: message.message,
              x: 10 + Math.random() * 55,
              startY: 60 + Math.random() * 20,
              sentiment: message.sentiment
            }];
          });
        });

        connection.on('MessageRejected', (messageId: string) => {
          console.log('MessageRejected:', messageId);
          setHistory(prev => prev.map(m => m.id === messageId ? { ...m, sentiment: 'Negative' } : m));
          setBubbles(prev => prev.map(b => b.id === messageId ? { ...b, sentiment: 'Negative' } : b));
        });
      }
    };

    startConnection();

    return () => {
      isMounted = false;
      if (connection) {
        connection.stop().catch(() => {});
        connRef.current = null;
      }
    };
  }, [id]);

  const removeBubble = useCallback((bubbleId: string | number) => {
    setBubbles(prev => prev.filter(b => b.id !== bubbleId));
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !id) return;

    // 1. Optimistic update: Add local bubble so it floats immediately
    const tempId = `local-${Date.now()}`;
    const bubble: Bubble = {
      id: tempId,
      text,
      x: 10 + Math.random() * 55,
      startY: 60 + Math.random() * 20,
    };
    setBubbles(prev => [...prev, bubble]);

    // 2. Add to history for immediate feedback
    const optimisticMsg = {
      id: tempId,
      message: text,
      userName: 'Vui lòng chờ duyệt',
      createdAt: new Date().toISOString()
    };
    setHistory(prev => [optimisticMsg, ...prev].slice(0, 50));
    setInput('');

    // 3. Send to server
    try {
      const res = await wishwallApi.sendMessage(id, text);
      const resData = res.data as any;
      const newMessage = resData.data || resData;
      console.log('SendMessage success:', newMessage);
      
      if (newMessage && newMessage.id) {
        // Sync IDs
        setHistory(prev => prev.map(m => m.id === tempId ? { ...m, id: newMessage.id } : m));
        setBubbles(prev => prev.map(b => b.id === tempId ? { ...b, id: newMessage.id } : b));
      }
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Không thể gửi tin nhắn. Vui lòng kiểm tra kết nối mạng.');
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
            <p className="text-[#e91e8c] text-xs font-bold uppercase tracking-widest">Wishwall</p>
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

      {/* ── Recent Messages Tray ─────────────────────── */}
      <div className={`absolute bottom-[76px] left-0 right-0 z-30 transition-all duration-300 ease-in-out px-4 ${isTrayOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
        <div className="max-w-xl mx-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl h-[40vh] flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Tin nhắn gần đây</h3>
            <button onClick={() => setIsTrayOpen(false)} className="text-white/30 hover:text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {history.length === 0 ? (
              <p className="text-white/20 text-xs text-center mt-10 italic">Chưa có tin nhắn nào.</p>
            ) : (
              history.map((msg: any) => (
                <div key={msg.id} className="flex flex-col gap-1 group">
                  <div className="flex items-center gap-2">
                    {msg.sentiment === 'Positive' ? (
                      <span className="text-sm shadow-[0_0_10px_#FFD700]">🔥</span>
                    ) : msg.sentiment === 'Neutral' ? (
                      <div className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_5px_#22c55e]" />
                    ) : (
                      <span className="text-sm font-black text-[#e91e8c] drop-shadow-[0_0_5px_rgba(233,30,140,0.5)]">✓</span>
                    )}
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter truncate max-w-[100px]">
                      {msg.userName || 'Ẩn danh'}
                    </span>
                  </div>
                  <p className="text-sm text-white/90 font-light pl-3.5 leading-tight">{msg.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Input bar (Fixed at bottom) ─────────────── */}
      <div className="shrink-0 w-full bg-[#0d1117]/80 backdrop-blur-md border-t border-white/5 z-40">
        <div className="px-4 py-4 flex items-center gap-2 max-w-xl mx-auto">
          {/* Toggle History Button */}
          <button
            onClick={() => setIsTrayOpen(!isTrayOpen)}
            className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center border transition-all ${
              isTrayOpen ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>

          <div className="flex-1 flex items-center bg-[#1e2433] rounded-full px-4 h-11 gap-2 border border-white/5">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              maxLength={80}
              className="flex-1 bg-transparent text-white text-base placeholder-gray-500 outline-none"
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

function FloatingBubble({ bubble, onDone }: { bubble: Bubble; onDone: (id: string | number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const anim = el.animate(
      [
        { transform: 'translateY(0px)', opacity: 1 },
        { transform: 'translateY(-15vh)', opacity: 0.9, offset: 0.3 },
        { transform: 'translateY(-40vh)', opacity: 0.7, offset: 0.6 },
        { transform: 'translateY(-90vh)', opacity: 0 },
      ],
      { duration: 4500, easing: 'ease-out', fill: 'forwards' }
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
        background: bubble.sentiment === 'Positive' 
          ? 'linear-gradient(135deg, #FFD700, #B8860B)' 
          : bubble.sentiment === 'Neutral'
            ? 'linear-gradient(135deg, #22c55e, #15803d)'
            : bubble.sentiment === 'Negative'
              ? 'linear-gradient(135deg, #f97316, #c2410c)'
              : 'linear-gradient(135deg, #0e7490cc, #164e63cc)',
        backdropFilter: 'blur(4px)',
        border: bubble.sentiment === 'Positive'
          ? '1px solid rgba(255, 215, 0, 0.4)'
          : bubble.sentiment === 'Neutral'
            ? '1px solid rgba(34, 197, 94, 0.4)'
            : bubble.sentiment === 'Negative'
              ? '1px solid rgba(249, 115, 22, 0.4)'
              : '1px solid rgba(6,182,212,0.4)',
        boxShadow: bubble.sentiment === 'Positive'
          ? '0 0 15px rgba(255, 215, 0, 0.2)'
          : bubble.sentiment === 'Neutral'
            ? '0 0 15px rgba(34, 197, 94, 0.2)'
            : bubble.sentiment === 'Negative'
              ? '0 0 15px rgba(249, 115, 22, 0.2)'
              : 'none',
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

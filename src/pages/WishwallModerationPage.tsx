import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { wishwallApi, createWishwallConnection } from '../services/wishwallService';
import { eventService, type PublicEvent, getEventStatus } from '../services/eventService';
import type { AiLabel, PendingWishwallMessage, WishwallAiLog, WishwallStaffPending, LedDisplayMessage } from '../types/wishwall';
import { formatToLocalTime } from '../lib/dateUtils';

export default function WishwallModerationPage() {
  const { id: paramEventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // ── Event picker & basic state ─────────────────────────────────────────────
  const [selectedEventId, setSelectedEventId] = useState<string | null>(paramEventId ?? null);
  const [selectedEventName, setSelectedEventName] = useState<string>('');
  const [ongoingEvents, setOngoingEvents] = useState<PublicEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(!paramEventId);

  // ── Stats and search state ──────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'latest'>('priority');
  const [messages, setMessages] = useState<PendingWishwallMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  
  // Stats
  const [wishesReceivedCount, setWishesReceivedCount] = useState(0);
  const [totalApprovedCount, setTotalApprovedCount] = useState(0);

  // ── LED Controls & State ───────────────────────────────────────────────────
  const [ledMessages, setLedMessages] = useState<LedDisplayMessage[]>([]);
  const [ledDuration, setLedDuration] = useState<number>(30); // Default 30s
  const [customDuration, setCustomDuration] = useState<string>('');
  const [isAutoModEnabled, setIsAutoModEnabled] = useState<boolean>(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'pending' | 'ai-logs'>('pending');
  const [aiLogs, setAiLogs] = useState<WishwallAiLog[]>([]);
  const [aiLogsLoading, setAiLogsLoading] = useState(false);
  const [systemAlert, setSystemAlert] = useState<{ alertType: string, message: string } | null>(null);

  const connRef = useRef<ReturnType<typeof createWishwallConnection> | null>(null);

  const getAiLabelMeta = (label?: AiLabel | null) => {
    switch (label) {
      case 'BLOCK':
        return { text: 'BLOCK', className: 'border-rose-500/40 text-rose-400 bg-rose-500/10' };
      case 'REVIEW':
        return { text: 'REVIEW', className: 'border-amber-400/40 text-amber-300 bg-amber-500/10' };
      case 'ALLOW':
        return { text: 'ALLOW', className: 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10' };
      default:
        return { text: 'AI N/A', className: 'border-white/20 text-white/40 bg-white/5' };
    }
  };

  const sortPendingMessages = (items: PendingWishwallMessage[]) => {
    const priority = (label?: AiLabel | null) => {
      if (label === 'BLOCK') return 0;
      if (label === 'REVIEW') return 1;
      if (label === 'ALLOW') return 2;
      return 3;
    };
    return [...items].sort((a, b) => {
      const labelDelta = priority(a.aiLabel) - priority(b.aiLabel);
      if (labelDelta !== 0) return labelDelta;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Latest first inside priority groups
    });
  };

  useEffect(() => {
    if (paramEventId) {
      setSelectedEventId(paramEventId);
    }
  }, [paramEventId]);

  // Load events
  useEffect(() => {
    if (selectedEventId) {
      if (!selectedEventName) {
        eventService.getEventById(selectedEventId)
          .then(ev => setSelectedEventName(ev.name))
          .catch(() => {});
      }
      return;
    } 
    
    eventService.getAllEvents('Active')
      .then(data => {
        const liveEvents = data.filter(ev => getEventStatus(ev) === 'live');
        setOngoingEvents(liveEvents);
      })
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, [selectedEventId, selectedEventName]);

  const handleSelectEvent = (ev: PublicEvent) => {
    navigate(`/events/${ev.id}/wishwall/moderation`);
  };

  // ── Load pending & initial LED messages ─────────────────────────────────────
  const loadPending = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await wishwallApi.getPendingMessages(selectedEventId);
      const data: PendingWishwallMessage[] = (res.data as { data: PendingWishwallMessage[] }).data ?? [];
      setMessages(sortPendingMessages(data));
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  const loadLedMessagesAndStats = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const res = await wishwallApi.getMessages(selectedEventId);
      const approved = res.data?.data || [];
      setTotalApprovedCount(approved.length);
      // Synchronize mini preview with current top 10 LED messages
      setLedMessages(approved.slice(0, 10));
    } catch {}
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedEventId) {
      loadPending();
      loadLedMessagesAndStats();
      // Load auto-mod toggle state
      const savedAutoMod = localStorage.getItem(`automod:${selectedEventId}`);
      if (savedAutoMod) {
        setIsAutoModEnabled(savedAutoMod === 'true');
      }
    }
  }, [selectedEventId, loadPending, loadLedMessagesAndStats]);

  const loadAiLogs = useCallback(async () => {
    if (!selectedEventId) return;
    setAiLogsLoading(true);
    try {
      const res = await wishwallApi.getAiLogs(selectedEventId, 200);
      const data: WishwallAiLog[] = (res.data as { data: WishwallAiLog[] }).data ?? [];
      setAiLogs(data);
    } catch {
      // ignore
    } finally {
      setAiLogsLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (activeTab !== 'ai-logs') return;
    loadAiLogs();
  }, [activeTab, loadAiLogs]);

  // ── SignalR Setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedEventId) return;

    const conn = createWishwallConnection();
    connRef.current = conn;

    conn.start().then(() => {
      conn.invoke('JoinStaff', selectedEventId).catch(() => {});
      conn.invoke('JoinLed', selectedEventId).catch(() => {});
    });

    conn.on('NewPendingMessage', (payload: WishwallStaffPending) => {
      console.log('SignalR NewPendingMessage received:', payload);
      setWishesReceivedCount(prev => prev + 1);

      // Auto-Mod handler
      const isAutoMod = localStorage.getItem(`automod:${selectedEventId}`) === 'true';
      if (isAutoMod && payload.aiLabel === 'ALLOW') {
        console.log('[Auto-Mod] Auto-approving clean message:', payload.id);
        wishwallApi.approveMessage(selectedEventId, payload.id, 'Neutral')
          .then(() => wishwallApi.displayOnLed(selectedEventId, payload.id))
          .then(() => {
            setTotalApprovedCount(prev => prev + 1);
          })
          .catch(err => console.error('[Auto-Mod] Failed to auto-approve:', err));
        return; // Don't add to pending list
      }

      setMessages(prev => {
        if (prev.some(m => m.id === payload.id)) return prev;
        const next = [
          ...prev,
          {
            id: payload.id,
            userId: '',
            userName: payload.userName,
            message: payload.message,
            sentiment: payload.sentiment,
            createdAt: payload.createdAt,
            aiLabel: payload.aiLabel ?? null,
            aiReason: payload.aiReason ?? null,
          }
        ];
        return sortPendingMessages(next);
      });
    });

    conn.on('SystemAlert', (payload: { alertType: string, message: string }) => {
      console.warn('SignalR SystemAlert received:', payload);
      setSystemAlert(payload);
      setTimeout(() => setSystemAlert(null), 10000);
    });

    conn.on('NewAiLog', (payload: WishwallAiLog) => {
      console.log('SignalR NewAiLog received:', payload);
      setAiLogs(prev => [payload, ...prev]);
    });

    // Sync LED screen messages in mini preview
    conn.on('LedDisplay', (payload: LedDisplayMessage) => {
      setLedMessages(prev => {
        if (prev.some(m => m.id === payload.id)) return prev;
        return [payload, ...prev].slice(0, 10);
      });
    });

    conn.on('LedClear', () => {
      setLedMessages([]);
    });

    conn.on('LedDurationChanged', (duration: number) => {
      setLedDuration(duration);
    });

    return () => {
      conn.invoke('LeaveStaff', selectedEventId).catch(() => {});
      conn.invoke('LeaveLed', selectedEventId).catch(() => {});
      conn.stop();
      connRef.current = null;
    };
  }, [selectedEventId]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleDisplay = async (msg: PendingWishwallMessage, sentiment: string = 'Neutral') => {
    if (!selectedEventId || actionId) return;
    setActionId(`display-${msg.id}-${sentiment}`);
    try {
      await wishwallApi.approveMessage(selectedEventId, msg.id, sentiment);
      await wishwallApi.displayOnLed(selectedEventId, msg.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      setTotalApprovedCount(prev => prev + 1);
    } catch {
      // ignore
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (msg: PendingWishwallMessage) => {
    if (!selectedEventId || actionId) return;
    setActionId(`reject-${msg.id}`);
    try {
      await wishwallApi.rejectMessage(selectedEventId, msg.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch {
      // ignore
    } finally {
      setActionId(null);
    }
  };

  const handleBanUserAndClear = async (msg: PendingWishwallMessage) => {
    if (!selectedEventId || actionId) return;
    setActionId(`ban-${msg.id}`);
    try {
      await wishwallApi.rejectMessage(selectedEventId, msg.id);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      alert(`Đã cấm người dùng ${msg.userName || 'Ẩn danh'} và dọn dẹp các tin nhắn vi phạm (Chức năng cấm mô phỏng).`);
    } catch {
      // ignore
    } finally {
      setActionId(null);
    }
  };

  // ── Hub Events ─────────────────────────────────────────────────────────────
  const updateLedDuration = async (seconds: number) => {
    if (!selectedEventId || !connRef.current) return;
    setLedDuration(seconds);
    try {
      await connRef.current.invoke('UpdateLedDuration', selectedEventId, seconds);
    } catch (err) {
      console.error('Failed to update LED duration via SignalR:', err);
    }
  };

  const handleClearLed = async () => {
    if (!selectedEventId || !connRef.current) return;
    if (!confirm('Bạn có chắc chắn muốn xóa nhanh toàn bộ tin nhắn trên màn hình LED lớn?')) return;
    try {
      await connRef.current.invoke('TriggerLedClear', selectedEventId);
    } catch (err) {
      console.error('Failed to clear LED screen via SignalR:', err);
    }
  };

  // Filter & Sort
  const filteredMessages = messages.filter(m => 
    m.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.userName && m.userName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedMessages = sortBy === 'priority'
    ? sortPendingMessages(filteredMessages)
    : [...filteredMessages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Statistics Calculation
  const incomingRate = Math.max(12, wishesReceivedCount * 60); // Mock wishes per hour
  const featuredSlotsCount = ledMessages.filter(m => m.sentiment === 'Positive').length;

  // ── Event picker screen ────────────────────────────────────────────────────
  if (!selectedEventId) {
    return (
      <div className="min-h-screen bg-black overflow-hidden flex flex-col" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div className="h-16 flex items-center justify-between px-8 border-b border-white/10 bg-black/70 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-xl font-semibold tracking-wide">Wishwall Staff</span>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-xs text-white/50 hover:text-white transition-colors border border-white/10 hover:border-white/30 px-3 py-1 rounded-full"
          >
            ĐĂNG XUẤT
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center pt-12 p-6 max-w-2xl mx-auto w-full">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">Duyệt Wishwall</h1>
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
                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                            <span>{ev.location}</span>
                          </div>
                        )}
                        <span className="flex items-center gap-1.5 text-teal-400 text-xs font-bold uppercase tracking-widest">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                          LIVE
                        </span>
                      </div>
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
    <div className="min-h-screen bg-[#0d1117] text-[#e5e2e1] flex flex-col font-['Inter'] select-none">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        .neo-glass-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .neo-stats-card {
          background: #161b22;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mini-preview-container {
          background: #07090e;
          border: 1px solid rgba(0, 229, 255, 0.3);
          box-shadow: 0 0 15px -3px rgba(0, 229, 255, 0.1) inset;
        }

        .mini-card-cyan {
          background: rgba(255, 255, 255, 0.02);
          border-left: 2.5px solid #00e5ff;
        }

        .mini-card-pink {
          background: rgba(236, 72, 153, 0.05);
          border-top: 2.5px solid #ec4899;
        }
      `}</style>

      {/* Top Navbar */}
      <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#0d1117] sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-white font-['Outfit'] font-bold text-lg leading-none">Wishwall Admin</span>
          <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider mt-1">{selectedEventName || 'Event Session'}</span>
        </div>

        {/* Middle controls: Search, Auto-Mod, Live */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-lg">search</span>
            <input
              type="text"
              placeholder="Search wishes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-[#161b22] border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00e5ff] w-64 transition-all"
            />
          </div>

          {/* Auto-Mod Toggle Switch */}
          <div className="flex items-center gap-3 border-l border-white/5 pl-6">
            <span className="text-xs font-bold text-[#bbc9cf] tracking-widest uppercase">Auto-Mod</span>
            <button
              onClick={() => {
                const nextVal = !isAutoModEnabled;
                setIsAutoModEnabled(nextVal);
                localStorage.setItem(`automod:${selectedEventId}`, String(nextVal));
              }}
              className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none relative flex items-center ${
                isAutoModEnabled ? 'bg-[#00e5ff]' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  isAutoModEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-2 border-l border-white/5 pl-6">
            <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse"></span>
            <span className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-widest">Live Session</span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-white/40 hover:text-white cursor-pointer transition-colors text-xl">notifications</span>
          <span className="material-symbols-outlined text-white/40 hover:text-white cursor-pointer transition-colors text-xl">apps</span>
          
          <button
            onClick={() => {
              setSelectedEventId(null);
              setSelectedEventName('');
              setMessages([]);
              setEventsLoading(true);
            }}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/5 hover:border-white/20"
          >
            Đổi sự kiện
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors border border-white/5 hover:border-white/20 px-3 py-1.5 rounded-full"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-[1440px] w-full mx-auto px-8 py-8 flex flex-col gap-8 overflow-y-auto">
        {systemAlert && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <span className="material-symbols-outlined text-rose-400">warning</span>
            <div className="flex-1">
              <div className="text-rose-400 font-bold text-xs uppercase tracking-widest">{systemAlert.alertType}</div>
              <p className="text-white/80 text-sm">{systemAlert.message}</p>
            </div>
            <button onClick={() => setSystemAlert(null)} className="text-white/40 hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* ── Dashboard Stats ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
          <div className="neo-stats-card p-6 rounded-2xl flex flex-col justify-between h-[120px]">
            <div>
              <p className="text-[10px] font-bold text-[#bbc9cf] uppercase tracking-widest">Incoming Rate</p>
              <h3 className="text-2xl font-bold font-['Outfit'] text-white mt-1">{incomingRate} wishes/hr</h3>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#00e5ff] h-full rounded-full" style={{ width: `${Math.min(100, (incomingRate / 300) * 100)}%` }} />
            </div>
          </div>

          <div className="neo-stats-card p-6 rounded-2xl flex flex-col justify-between h-[120px]">
            <div>
              <p className="text-[10px] font-bold text-[#bbc9cf] uppercase tracking-widest">Pending Review</p>
              <h3 className="text-2xl font-bold font-['Outfit'] text-white mt-1">{messages.length} wishes</h3>
            </div>
            <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-ping" /> Action Required
            </p>
          </div>

          <div className="neo-stats-card p-6 rounded-2xl flex flex-col justify-between h-[120px]">
            <div>
              <p className="text-[10px] font-bold text-[#bbc9cf] uppercase tracking-widest">Total Approved</p>
              <h3 className="text-2xl font-bold font-['Outfit'] text-white mt-1">{totalApprovedCount} wishes</h3>
            </div>
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">+12% from last hour</p>
          </div>

          <div className="neo-stats-card p-6 rounded-2xl flex flex-col justify-between h-[120px]">
            <div>
              <p className="text-[10px] font-bold text-[#bbc9cf] uppercase tracking-widest">Featured Slots</p>
              <h3 className="text-2xl font-bold font-['Outfit'] text-white mt-1">{featuredSlotsCount} / 10</h3>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#ec4899] h-full rounded-full" style={{ width: `${(featuredSlotsCount / 10) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* ── Two Column Layout (Moderation List & LED Controls) ────────────────── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-0">
          
          {/* ── Left Column: Moderation List (Col Span 3) ────────────────────── */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                    activeTab === 'pending'
                      ? 'border-teal-400/60 text-teal-300 bg-teal-500/10'
                      : 'border-white/5 text-white/40 hover:text-white/70'
                  }`}
                >
                  Incoming Wishes
                </button>
                <button
                  onClick={() => setActiveTab('ai-logs')}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                    activeTab === 'ai-logs'
                      ? 'border-amber-400/60 text-amber-300 bg-amber-500/10'
                      : 'border-white/5 text-white/40 hover:text-white/70'
                  }`}
                >
                  AI Logs
                </button>
              </div>

              {activeTab === 'pending' && (
                <div className="flex items-center gap-4">
                  <div className="flex bg-[#161b22] border border-white/5 rounded-lg p-0.5">
                    <button
                      onClick={() => setSortBy('priority')}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${
                        sortBy === 'priority' ? 'bg-white/5 text-white' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      Priority First
                    </button>
                    <button
                      onClick={() => setSortBy('latest')}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${
                        sortBy === 'latest' ? 'bg-white/5 text-white' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      Latest
                    </button>
                  </div>

                  <button
                    onClick={() => loadPending()}
                    disabled={loading}
                    className="p-2 rounded-lg border border-white/5 hover:border-white/20 text-[#bbc9cf] hover:text-white bg-white/2"
                  >
                    <span className={`material-symbols-outlined text-lg block ${loading ? 'animate-spin' : ''}`}>sync</span>
                  </button>
                </div>
              )}
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto pr-2 min-h-0">
              {activeTab === 'pending' ? (
                loading ? (
                  <p className="text-white/30 text-sm text-center mt-20 animate-pulse uppercase tracking-widest">Loading messages…</p>
                ) : sortedMessages.length === 0 ? (
                  <div className="text-center mt-20 text-white/20">
                    <span className="material-symbols-outlined text-5xl mb-4">drafts</span>
                    <p className="text-lg font-medium">Không có tin nhắn nào chờ duyệt.</p>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {sortedMessages.map((msg, idx) => {
                      const aiMeta = getAiLabelMeta(msg.aiLabel ?? null);
                      const isSuspicious = msg.aiLabel === 'BLOCK' || msg.sentiment === 'Negative';
                      
                      return (
                        <li
                          key={msg.id}
                          className="bg-[#161b22] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6 hover:border-white/10 transition-all shadow-md"
                        >
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <span className="text-xs font-semibold text-white/40">#{1000 + idx}</span>
                              <span className="text-xs font-semibold text-white/40">•</span>
                              <span className="text-xs font-semibold text-white/40">{formatToLocalTime(msg.createdAt)}</span>
                              
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${aiMeta.className}`} title={msg.aiReason ?? ''}>
                                {aiMeta.text}
                              </span>

                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                                msg.sentiment === 'Positive' ? 'border-[#ec4899]/30 text-[#ec4899] bg-[#ec4899]/10' : 'border-white/10 text-white/40 bg-white/2'
                              }`}>
                                Sentiment: {msg.sentiment}
                              </span>
                            </div>
                            <p className="text-white text-lg font-normal leading-relaxed">"{msg.message}"</p>
                            
                            <div className="flex items-center gap-2 mt-4">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#ec4899] to-[#00e5ff] flex items-center justify-center text-[10px] font-bold text-white uppercase">
                                {msg.userName ? msg.userName.slice(0, 2) : 'AN'}
                              </div>
                              <span className="text-xs text-[#bbc9cf] font-semibold">{msg.userName || 'Anonymous'}</span>
                            </div>
                          </div>

                          {/* Action Buttons Column */}
                          <div className="flex flex-col gap-2 justify-center shrink-0 w-full md:w-48">
                            {isSuspicious ? (
                              <>
                                <button
                                  disabled={!!actionId}
                                  onClick={() => handleBanUserAndClear(msg)}
                                  className="w-full py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[16px]">gavel</span> Ban User & Clear
                                </button>
                                <button
                                  disabled={!!actionId}
                                  onClick={() => handleReject(msg)}
                                  className="w-full py-2 text-white/40 border border-white/5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                                >
                                  Reject Message
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  disabled={!!actionId}
                                  onClick={() => handleDisplay(msg, 'Neutral')}
                                  className="w-full py-2.5 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff] text-xs font-bold uppercase tracking-wider hover:bg-[#00e5ff]/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[16px]">check_circle</span> Approve Normal
                                </button>
                                <button
                                  disabled={!!actionId}
                                  onClick={() => handleDisplay(msg, 'Positive')}
                                  className="w-full py-2.5 rounded-lg bg-[#ec4899]/10 border border-[#ec4899]/20 text-[#ec4899] text-xs font-bold uppercase tracking-wider hover:bg-[#ec4899]/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span> Approve Featured
                                </button>
                                <button
                                  disabled={!!actionId}
                                  onClick={() => handleReject(msg)}
                                  className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-semibold uppercase tracking-wider transition-all"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : (
                aiLogsLoading ? (
                  <p className="text-white/30 text-sm text-center mt-20 animate-pulse uppercase tracking-widest">Loading AI logs...</p>
                ) : aiLogs.length === 0 ? (
                  <div className="text-center mt-20 text-white/20">
                    <span className="material-symbols-outlined text-5xl mb-4">analytics</span>
                    <p className="text-lg font-medium">Không có AI log.</p>
                  </div>
                ) : (
                  <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                    <div className="grid grid-cols-6 gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wider text-white/40 border-b border-white/5">
                      <div className="col-span-2">Message</div>
                      <div>Label</div>
                      <div className="col-span-2">Reason</div>
                      <div>Time</div>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                      {aiLogs.map((log, idx) => {
                        const aiMeta = getAiLabelMeta(log.label);
                        return (
                          <div key={idx} className="grid grid-cols-6 gap-2 px-6 py-5 text-sm border-b border-white/5 items-center">
                            <div className="col-span-2 text-white font-medium">"{log.message}"</div>
                            <div>
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${aiMeta.className}`}>
                                {aiMeta.text}
                              </span>
                              <div className="text-[10px] text-white/30 mt-1">
                                {log.source} • {Math.round(log.durationMs)}ms
                              </div>
                            </div>
                            <div className="col-span-2 text-white/50 text-xs italic">{log.reason}</div>
                            <div className="text-white/30 text-xs">{formatToLocalTime(log.createdAt)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* ── Right Column: LED Controls Dashboard (Col Span 1) ───────────── */}
          <div className="lg:col-span-1 flex flex-col gap-6 shrink-0 min-h-0">
            
            {/* LED MINI PREVIEW CARD */}
            <div className="neo-stats-card rounded-2xl p-5 flex flex-col h-[280px]">
              <h4 className="text-xs font-bold text-[#bbc9cf] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00e5ff]">tv</span> Màn hình LED Mini (Live)
              </h4>
              
              <div className="flex-1 mini-preview-container rounded-xl p-3 overflow-y-auto flex flex-col gap-2 min-h-0">
                {ledMessages.length === 0 ? (
                  <p className="text-[10px] text-white/20 italic text-center my-auto">Màn hình LED trống</p>
                ) : (
                  ledMessages.map(msg => {
                    const isPositive = msg.sentiment === 'Positive';
                    return (
                      <div
                        key={msg.id}
                        className={`p-2 rounded-lg text-[9px] leading-normal flex flex-col justify-between h-fit shrink-0 ${
                          isPositive ? 'mini-card-pink' : 'mini-card-cyan'
                        }`}
                      >
                        <p className="text-white font-medium line-clamp-2">"{msg.message}"</p>
                        <div className="flex justify-between items-center mt-1 text-[8px] text-white/40">
                          <span>— {msg.userName || 'Anonymous'}</span>
                          <span className={isPositive ? 'text-[#ec4899]' : 'text-[#00e5ff]'}>{msg.sentiment}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* LED TIME DISPLAY CONFIG CARD */}
            <div className="neo-stats-card rounded-2xl p-5 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-[#bbc9cf] uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00e5ff]">schedule</span> Thời gian hiển thị LED
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    updateLedDuration(30);
                    setCustomDuration('');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${
                    ledDuration === 30 && !customDuration
                      ? 'border-[#00e5ff]/50 bg-[#00e5ff]/10 text-[#00e5ff]'
                      : 'border-white/5 text-white/50 hover:text-white bg-white/2'
                  }`}
                >
                  30 Giây
                </button>
                <button
                  onClick={() => {
                    updateLedDuration(60);
                    setCustomDuration('');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${
                    ledDuration === 60 && !customDuration
                      ? 'border-[#00e5ff]/50 bg-[#00e5ff]/10 text-[#00e5ff]'
                      : 'border-white/5 text-white/50 hover:text-white bg-white/2'
                  }`}
                >
                  1 Phút
                </button>
              </div>

              {/* Custom Duration Input */}
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Tự nhập giây..."
                  value={customDuration}
                  onChange={e => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val)) {
                      setCustomDuration(val);
                      if (val) updateLedDuration(parseInt(val, 10));
                    }
                  }}
                  className="bg-[#07090e] border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#00e5ff] w-full"
                />
              </div>

              <div className="text-[10px] text-white/30 leading-normal italic mt-1">
                ● Cài đặt LED tự động dọn tin nhắn hết hạn sau {ledDuration} giây.
              </div>
            </div>

            {/* LED CLEAR EMERGENCY CARD */}
            <div className="neo-stats-card rounded-2xl p-5 flex flex-col gap-3 mt-auto">
              <button
                onClick={handleClearLed}
                className="w-full py-3.5 rounded-xl bg-rose-600/10 border border-rose-600/30 text-rose-400 text-xs font-bold uppercase tracking-widest hover:bg-rose-600/20 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/5 animate-pulse"
              >
                <span className="material-symbols-outlined text-[18px]">delete_forever</span> Xóa màn hình LED
              </button>
              <div className="text-[9px] text-rose-400/60 leading-normal text-center font-medium uppercase tracking-wider">
                Lệnh khẩn cấp • Kích hoạt hiệu ứng tan vỡ
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}


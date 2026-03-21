import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { wishwallApi, createWishwallConnection } from '../services/wishwallService';
import { eventService, type PublicEvent, getEventStatus } from '../services/eventService';
import type { AiLabel, PendingWishwallMessage, WishwallAiLog, WishwallStaffPending } from '../types/wishwall';
import { formatToLocalTime } from '../lib/dateUtils';

export default function WishwallModerationPage() {
  const { id: paramEventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

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
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  // If navigated via /staff/wishwall, paramEventId is undefined → show picker
  const [selectedEventId, setSelectedEventId] = useState<string | null>(paramEventId ?? null);
  const [selectedEventName, setSelectedEventName] = useState<string>('');

  useEffect(() => {
    if (paramEventId) {
      setSelectedEventId(paramEventId);
    }
  }, [paramEventId]);

  // ── Event picker state ─────────────────────────────────────────────────────
  const [ongoingEvents, setOngoingEvents] = useState<PublicEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(!paramEventId);

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

  // ── Pending messages state ─────────────────────────────────────────────────
  const [messages, setMessages] = useState<PendingWishwallMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const connRef = useRef<ReturnType<typeof createWishwallConnection> | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'ai-logs'>('pending');
  const [aiLogs, setAiLogs] = useState<WishwallAiLog[]>([]);
  const [aiLogsLoading, setAiLogsLoading] = useState(false);
  const [systemAlert, setSystemAlert] = useState<{ alertType: string, message: string } | null>(null);

  // ── Load pending messages ──────────────────────────────────────────────────
  const loadPending = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await wishwallApi.getPendingMessages(selectedEventId);
      const data: PendingWishwallMessage[] = (res.data as { data: PendingWishwallMessage[] }).data ?? [];
      const sortedData = sortPendingMessages(data);
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

  // ── SignalR: receive new pending messages in real-time ─────────────────────
  useEffect(() => {
    if (!selectedEventId) return;

    const conn = createWishwallConnection();
    connRef.current = conn;

    conn.start().then(() => {
      conn.invoke('JoinStaff', selectedEventId).catch(() => {});
    });

    conn.on('NewPendingMessage', (payload: WishwallStaffPending) => {
      console.log('SignalR NewPendingMessage received:', payload);
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
      // Auto-clear alert after 10 seconds
      setTimeout(() => setSystemAlert(null), 10000);
    });

    conn.on('NewAiLog', (payload: WishwallAiLog) => {
      console.log('SignalR NewAiLog received:', payload);
      setAiLogs(prev => [payload, ...prev]);
    });

    return () => {
      conn.invoke('LeaveStaff', selectedEventId).catch(() => {});
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

  // ── Event picker screen ────────────────────────────────────────────────────
  if (!selectedEventId) {
    return (
      <div className="min-h-screen bg-black overflow-hidden flex flex-col" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        {/* Header bar */}
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
          <span className="text-white/80 text-xl font-semibold tracking-wide">Duyệt Wishwall Staff</span>
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
            ĐĂNG XUẤT
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 w-full">
        {systemAlert && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <div className="text-rose-400 font-bold text-xs uppercase tracking-widest">{systemAlert.alertType}</div>
              <p className="text-white/80 text-sm">{systemAlert.message}</p>
            </div>
            <button onClick={() => setSystemAlert(null)} className="text-white/40 hover:text-white transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
              activeTab === 'pending'
                ? 'border-teal-400/60 text-teal-300 bg-teal-500/10'
                : 'border-white/10 text-white/40 hover:text-white/70'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('ai-logs')}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
              activeTab === 'ai-logs'
                ? 'border-amber-400/60 text-amber-300 bg-amber-500/10'
                : 'border-white/10 text-white/40 hover:text-white/70'
            }`}
          >
            AI Logs
          </button>
          {activeTab === 'pending' && (
            <button
              onClick={() => loadPending()}
              disabled={loading}
              className="ml-auto px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-teal-500/50 text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(20,184,166,0.2)]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
              Refresh
            </button>
          )}
          {activeTab === 'ai-logs' && (
            <button
              onClick={() => loadAiLogs()}
              disabled={aiLogsLoading}
              className="ml-auto px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-amber-500/50 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={aiLogsLoading ? 'animate-spin' : ''}>
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
              Refresh
            </button>
          )}
        </div>
        {activeTab === 'pending' ? (
          loading ? (
          <p className="text-white/30 text-sm text-center mt-20 animate-pulse uppercase tracking-widest">Đang tải tin nhắn…</p>
        ) : messages.length === 0 ? (
          <div className="text-center mt-20 text-white/20">
            <p className="text-5xl mb-4"></p>
            <p className="text-lg font-medium">Không có tin nhắn chờ duyệt.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map(msg => {
              const aiMeta = getAiLabelMeta(msg.aiLabel ?? null);
              return (
              <li
                key={msg.id}
                className="bg-white/5 border border-white/10 rounded-3xl p-6 transition-all shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-base font-bold text-teal-400 uppercase tracking-wider">
                        {msg.userName || 'Ẩn danh'}
                      </span>
                      <span
                        className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${aiMeta.className}`}
                        title={msg.aiReason ?? ''}
                      >
                        {aiMeta.text}
                      </span>
                      <span
                        className={`text-sm font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                          msg.sentiment === 'Positive' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                          msg.sentiment === 'Negative' ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' :
                          'border-white/20 text-white/50 bg-white/5'
                        }`}
                      >
                        {msg.sentiment === 'Positive' ? 'NỔI BẬT' : msg.sentiment === 'Negative' ? 'TỪ CHỐI' : 'BÌNH THƯỜNG'}
                      </span>
                    </div>
                    <p className="text-white text-2xl font-light leading-relaxed">{msg.message}</p>
                  </div>
                  <span className="text-white/30 text-sm font-medium shrink-0">
                    {formatToLocalTime(msg.createdAt)}
                  </span>
                </div>

                <div className="flex gap-4 pt-5 border-t border-white/5">
                  <button
                    disabled={!!actionId}
                    onClick={() => handleDisplay(msg, 'Positive')}
                    className="flex-1 py-4 rounded-2xl bg-amber-500 text-white text-xs font-extrabold uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-40 shadow-lg shadow-amber-500/20"
                  >
                    {actionId === `display-${msg.id}-Positive` ? 'XỬ LÝ...' : 'NỔI BẬT'}
                  </button>

                  <button
                    disabled={!!actionId}
                    onClick={() => handleDisplay(msg, 'Neutral')}
                    className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white text-xs font-extrabold uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-40 shadow-lg shadow-emerald-600/20"
                  >
                    {actionId === `display-${msg.id}-Neutral` ? 'XỬ LÝ...' : 'BÌNH THƯỜNG'}
                  </button>

                  <button
                    disabled={!!actionId}
                    onClick={() => handleReject(msg)}
                    className="flex-1 py-3 rounded-2xl bg-rose-600 text-white hover:bg-rose-500 text-[10px] font-extrabold uppercase tracking-widest transition-all disabled:opacity-40 shadow-lg shadow-rose-600/20"
                  >
                    {actionId === `reject-${msg.id}` ? 'Đang xử lý...' : 'TỪ CHỐI'}
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        )) : (
          aiLogsLoading ? (
            <p className="text-white/30 text-sm text-center mt-20 animate-pulse uppercase tracking-widest">Dang tai AI logs...</p>
          ) : aiLogs.length === 0 ? (
            <div className="text-center mt-20 text-white/20">
              <p className="text-5xl mb-4"></p>
              <p className="text-lg font-medium">Khong co AI log.</p>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
              <div className="grid grid-cols-6 gap-2 px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white/40 border-b border-white/10">
                <div className="col-span-2">Message</div>
                <div>Label</div>
                <div className="col-span-2">Reason</div>
                <div>Time</div>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {aiLogs.map(log => {
                  const aiMeta = getAiLabelMeta(log.label);
                  return (
                    <div key={`${log.messageId}-${log.createdAt}`} className="grid grid-cols-6 gap-2 px-6 py-5 text-base border-b border-white/5 items-center">
                      <div className="col-span-2 text-white font-medium">{log.message}</div>
                      <div>
                        <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${aiMeta.className}`}>
                          {aiMeta.text}
                        </span>
                        <div className="text-[11px] text-white/30 mt-1.5 font-medium italic">
                          {log.source} — {Math.round(log.durationMs)}ms
                        </div>
                      </div>
                      <div className="col-span-2 text-white/50 text-sm italic">{log.reason}</div>
                      <div className="text-white/30 text-xs font-mono">{formatToLocalTime(log.createdAt)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

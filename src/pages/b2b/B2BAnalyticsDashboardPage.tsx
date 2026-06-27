import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import B2BLayout from './B2BLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RatingDistItem { star: number; count: number; percent: number; }
interface FrameUsageStat { frameName: string; usageCount: number; frameType?: string; }
interface RecentFeedback { authorName: string; starRating: number; comment: string; createdAt: string; }

interface DashboardSummary {
  totalParticipants: number;
  totalPhotos: number;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: RatingDistItem[];
  frameUsageStats: FrameUsageStat[];
  recentFeedbacks: RecentFeedback[];
}

interface WishwallReport {
  positiveCount: number; negativeCount: number; neutralCount: number;
  positiveRate: number; negativeRate: number;
  topKeywords: { keyword: string; frequency: number }[];
}
interface HeatPoint { label: string; value: number; }
interface EventReport {
  wishwall: WishwallReport;
  heatMap: HeatPoint[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_ORDER = ['students', 'small', 'medium', 'large'];
const getPlanLevel = (tier?: string) => PLAN_ORDER.indexOf((tier ?? 'medium').toLowerCase());

// ─── Sub Components ───────────────────────────────────────────────────────────

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 20 20"
          fill={s <= Math.round(rating) ? '#facc15' : 'none'} stroke="#facc15" strokeWidth="1.5">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </span>
  );
}

function HeatMapChart({ points }: { points: HeatPoint[] }) {
  if (!points || points.length < 2) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:120, gap:8 }}>
        <span style={{ fontSize:32, opacity:0.3 }}>📊</span>
        <p style={{ color:'#71717a', fontSize:12 }}>Chưa có đủ dữ liệu hoạt động</p>
      </div>
    );
  }
  const W=480, H=100;
  const vals = points.map(p => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const step = W / (vals.length - 1);
  const coords = vals.map((v,i) => ({ x: i*step, y: H-10-((v-min)/span)*(H-24) }));
  const line = coords.map((c,i) => `${i===0?'M':'L'} ${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${W},${H} L 0,${H} Z`;
  const labelStep = Math.max(1, Math.floor(points.length / 6));
  return (
    <div style={{ width:'100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:100, display:'block' }}>
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#hg)"/>
        <path d={line} fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {coords.map((c,i) => <circle key={i} cx={c.x} cy={c.y} r="3" fill="#00d4ff"/>)}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', padding:'0 4px', marginTop:4 }}>
        {points.filter((_,i) => i%labelStep===0).map((p,i) => (
          <span key={i} style={{ color:'#52525b', fontSize:10 }}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

function FrameColumnChart({ arTotal, photoboothTotal }: { arTotal:number; photoboothTotal:number }) {
  const maxV = Math.max(arTotal, photoboothTotal, 1);
  const bars = [
    { label:'AR Frames', value:arTotal, color:'#00d4ff' },
    { label:'Photobooth', value:photoboothTotal, color:'#9d50bb' },
  ];
  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:40, height:130, paddingBottom:8 }}>
      {bars.map(bar => (
        <div key={bar.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <span style={{ color:'white', fontSize:13, fontWeight:700 }}>{bar.value.toLocaleString('vi-VN')}</span>
          <div style={{ width:56, height:90, background:'rgba(255,255,255,0.06)', borderRadius:'8px 8px 0 0', overflow:'hidden', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            <div style={{ width:'100%', background:`linear-gradient(180deg, ${bar.color}cc, ${bar.color}44)`, height:`${Math.max((bar.value/maxV)*100,3)}%`, minHeight:4, borderRadius:'6px 6px 0 0' }}/>
          </div>
          <span style={{ color:'#71717a', fontSize:11 }}>{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

function RatingDistChart({ distribution }: { distribution: RatingDistItem[] }) {
  const sorted = [...distribution].sort((a,b) => b.star - a.star);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {sorted.map(({ star, count, percent }) => (
        <div key={star} style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ color:'#71717a', fontSize:12, width:24, textAlign:'right' }}>{star}★</span>
          <div style={{ flex:1, height:8, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ width:`${percent}%`, height:'100%', borderRadius:4, background: star>=4?'#00d4ff': star===3?'#9d50bb':'#e91e8c', transition:'width 0.7s' }}/>
          </div>
          <span style={{ color:'#71717a', fontSize:11, width:32 }}>{Math.round(percent)}%</span>
          <span style={{ color:'#52525b', fontSize:11, width:36, textAlign:'right' }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

function FeedbackCard({ fb }: { fb: RecentFeedback }) {
  const diff = Date.now() - new Date(fb.createdAt).getTime();
  const mins = Math.floor(diff/60000);
  const timeAgo = mins < 60 ? `${mins} phút trước` : mins < 1440 ? `${Math.floor(mins/60)} giờ trước` : `${Math.floor(mins/1440)} ngày trước`;
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
        <span style={{ color:'#d4d4d8', fontSize:12, fontWeight:600 }}>{fb.authorName || 'Ẩn danh'}</span>
        <span style={{ color:'#52525b', fontSize:10 }}>{timeAgo}</span>
      </div>
      <StarRow rating={fb.starRating} size={12}/>
      {fb.comment && <p style={{ color:'#71717a', fontSize:11, marginTop:6, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{fb.comment}</p>}
    </div>
  );
}

function WishwallDonut({ wr }: { wr: WishwallReport }) {
  const r=54, circ=2*Math.PI*r;
  const posLen=(wr.positiveRate/100)*circ;
  const negLen=(wr.negativeRate/100)*circ;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:24 }}>
      <svg width="128" height="128" viewBox="0 0 128 128" style={{ flexShrink:0 }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="#1f1f2e" strokeWidth="20"/>
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e91e8c" strokeWidth="20"
          strokeDasharray={`${negLen} ${circ-negLen}`} transform="rotate(-90 64 64)"/>
        <circle cx="64" cy="64" r={r} fill="none" stroke="#00d4ff" strokeWidth="20"
          strokeDasharray={`${posLen} ${circ-posLen}`} strokeDashoffset={-negLen} transform="rotate(-90 64 64)"/>
        <circle cx="64" cy="64" r="40" fill="#0a0a0f"/>
        <text x="64" y="60" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{Math.round(wr.positiveRate)}%</text>
        <text x="64" y="74" textAnchor="middle" fill="#9ca3af" fontSize="9">tích cực</text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:13 }}>
        {[
          { color:'#00d4ff', label:'Tích cực', val:wr.positiveCount },
          { color:'#e91e8c', label:'Tiêu cực', val:wr.negativeCount },
          { color:'#3f3f46', label:'Trung lập', val:wr.neutralCount },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:item.color, flexShrink:0 }}/>
            <span style={{ color:'#71717a' }}>{item.label}</span>
            <span style={{ color:'white', fontWeight:700, marginLeft:'auto', paddingLeft:12 }}>{item.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpgradePlanScreen({ planTier, onLogout }: { planTier:string; onLogout:()=>void }) {
  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:400, textAlign:'center' }}>
        <div style={{ width:72, height:72, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'0 auto 24px' }}>🔒</div>
        <h2 style={{ color:'white', fontSize:22, fontWeight:800, marginBottom:8 }}>Dashboard chưa khả dụng</h2>
        <p style={{ color:'#71717a', fontSize:14, marginBottom:6 }}>Gói <span style={{ color:'#00d4ff', fontWeight:700 }}>{planTier.charAt(0).toUpperCase()+planTier.slice(1)}</span> chưa bao gồm Analytics Dashboard.</p>
        <p style={{ color:'#52525b', fontSize:13, marginBottom:32 }}>Nâng cấp lên <strong style={{ color:'#9d50bb' }}>Medium</strong> hoặc <strong style={{ color:'#e91e8c' }}>Large</strong> để mở khoá.</p>
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <a href="mailto:linkie.project@gmail.com?subject=Nâng%20cấp%20gói" style={{ padding:'10px 24px', borderRadius:12, background:'linear-gradient(135deg,#00d4ff,#9d50bb)', color:'white', fontWeight:700, fontSize:13, textDecoration:'none' }}>Liên hệ nâng cấp</a>
          <button onClick={onLogout} style={{ padding:'10px 20px', borderRadius:12, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'#71717a', fontSize:13, cursor:'pointer' }}>Đăng xuất</button>
        </div>
      </div>
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background:'rgba(255,255,255,0.025)',
  border:'1px solid rgba(255,255,255,0.07)',
  borderRadius:16,
  padding:20,
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function B2BAnalyticsDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const managedEventId = user?.managedEventId;

  const planTier = (user?.planTier ?? 'medium').toLowerCase();
  const planLevel = getPlanLevel(planTier);
  const hasDashboard = planLevel >= 2;   // medium = index 2
  const isLarge     = planLevel >= 3;    // large  = index 3

  const [summary, setSummary]   = useState<DashboardSummary | null>(null);
  const [report, setReport]     = useState<EventReport | null>(null);
  const [eventName, setEventName] = useState('Dashboard');
  const [eventEndTime, setEventEndTime] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  useEffect(() => {
    if (!managedEventId) {
      setError('Tài khoản chưa được gán sự kiện. Vui lòng liên hệ Admin.');
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true); setError(null);

        const [evRes, sumRes] = await Promise.all([
          apiClient.get(`/events/${managedEventId}`),
          apiClient.get(`/b2b/events/${managedEventId}/dashboard-summary`),
        ]);
        const evData  = evRes.data.data  ?? evRes.data;
        const raw     = sumRes.data.data ?? sumRes.data;

        setEventName(evData.name ?? 'Sự Kiện');
        setEventEndTime(evData.endTime ?? null);

        // Rating distribution
        let ratingDist: RatingDistItem[] = raw.ratingDistribution ?? [];
        if (!ratingDist.length) {
          const tot = raw.totalReviews ?? raw.totalParticipants ?? 0;
          const avg = raw.averageRating ?? 4.0;
          ratingDist = [5,4,3,2,1].map(star => {
            const w  = Math.max(0, 1 - Math.abs(star - avg) * 0.4);
            const cnt = Math.round(tot * w * (avg >= star ? 0.6 : 0.15));
            return { star, count:cnt, percent: tot>0?(cnt/tot)*100:0 };
          });
        }

        setSummary({
          totalParticipants: raw.totalParticipants ?? 0,
          totalPhotos:       raw.totalPhotos ?? raw.totalFrameUsages ?? 0,
          averageRating:     raw.averageRating ?? 0,
          totalReviews:      raw.totalReviews  ?? 0,
          ratingDistribution: ratingDist,
          frameUsageStats:   raw.frameUsageStats ?? [],
          recentFeedbacks:   raw.recentFeedbacks ?? [],
        });

        if (isLarge) {
          try {
            const repRes = await apiClient.get(`/b2b/events/${managedEventId}/report`);
            setReport(repRes.data.data ?? repRes.data);
          } catch { /* large nhưng report lỗi — bỏ qua */ }
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.');
      } finally { setLoading(false); }
    };
    load();
  }, [managedEventId, isLarge]);

  const expiryWarning = (() => {
    if (!eventEndTime) return null;
    const days = Math.ceil((new Date(eventEndTime).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 3 ? `⚠️ Sự kiện kết thúc sau ${days} ngày. Tài khoản sẽ bị thu hồi.` : null;
  })();

  if (!hasDashboard && !loading) return <UpgradePlanScreen planTier={planTier} onLogout={handleLogout}/>;

  console.log('FRAME STATS:', summary?.frameUsageStats);
  const arTotal = (summary?.frameUsageStats ?? [])
    .filter(f => !(f.frameName || '').startsWith('[PB]'))
    .reduce((s,f) => s + f.usageCount, 0);

  const pbTotal = (summary?.frameUsageStats ?? [])
    .filter(f => (f.frameName || '').startsWith('[PB]'))
    .reduce((s,f) => s + f.usageCount, 0);

  const maxFrame = Math.max(...(summary?.frameUsageStats ?? []).map(f => f.usageCount), 1);

  return (
    <B2BLayout>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {/* Header content moved to Layout, but we can put expiryWarning here */}
        {expiryWarning && <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:12, padding:'12px 20px', color:'#fbbf24', fontSize:13, fontWeight:500 }}>{expiryWarning}</div>}

        {loading && (
          <div style={{ display:'flex', alignItems:'center', gap:12, color:'#71717a', justifyContent:'center', paddingTop:60 }}>
            <div style={{ width:20, height:20, border:'2px solid #00d4ff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            <span style={{ fontSize:13 }}>Đang tải Dashboard...</span>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
        {error && !loading && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12, padding:'14px 20px', color:'#f87171', fontSize:13 }}>{error}</div>}

        {!loading && !error && summary && (
          <>
            {/* Stat Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
              {/* Rating */}
              <div style={{ ...CARD, borderColor: summary.averageRating >= 4 ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize:10, color:'#52525b', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:12 }}>Đánh giá trung bình</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:36, fontWeight:900, color:'white' }}>{(summary.averageRating||0).toFixed(1)}</span>
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="#facc15"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                </div>
                <div style={{ height:2, width:'60%', background:'linear-gradient(90deg,#00d4ff,transparent)', borderRadius:2, marginBottom:8 }}/>
                <p style={{ color:'#52525b', fontSize:11 }}>từ {(summary.totalReviews||0).toLocaleString('vi-VN')} đánh giá</p>
              </div>

              {/* AR Photos */}
              <div style={CARD}>
                <div style={{ fontSize:10, color:'#52525b', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:12 }}>Tổng ảnh AR</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:36, fontWeight:900, color:'white' }}>{arTotal.toLocaleString('vi-VN')}</span>
                  <span style={{ fontSize:24 }}>📸</span>
                </div>
                <div style={{ height:2, width:'60%', background:'linear-gradient(90deg,#9d50bb,transparent)', borderRadius:2, marginBottom:8 }}/>
                <p style={{ color:'#52525b', fontSize:11 }}>{summary.frameUsageStats.length} frame hoạt động</p>
              </div>

              {/* Photobooth */}
              <div style={CARD}>
                <div style={{ fontSize:10, color:'#52525b', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:12 }}>Tổng ảnh Photobooth</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:36, fontWeight:900, color:'white' }}>{pbTotal.toLocaleString('vi-VN')}</span>
                  <span style={{ fontSize:24 }}>🖼️</span>
                </div>
                <div style={{ height:2, width:'60%', background:'linear-gradient(90deg,#3f3f46,transparent)', borderRadius:2, marginBottom:8 }}/>
                <p style={{ color:'#52525b', fontSize:11 }}>{summary.totalParticipants.toLocaleString('vi-VN')} khách tham dự</p>
              </div>

              {/* Deep Analytics: Shares & Timelapses */}
              <div style={CARD}>
                <div style={{ fontSize:10, color:'#52525b', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:12 }}>Tương tác chuyên sâu</div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div>
                    <div style={{ fontSize:11, color:'#a1a1aa', marginBottom:4 }}>Lượt Chia sẻ (Share)</div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                      <span style={{ fontSize:28, fontWeight:800, color:'#1877F2' }}>{(summary.totalShares || 0).toLocaleString('vi-VN')}</span>
                      <span style={{ fontSize:18 }}>🚀</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:'#a1a1aa', marginBottom:4 }}>Video Time-lapse</div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                      <span style={{ fontSize:28, fontWeight:800, color:'#ec4899' }}>{(summary.totalTimelapses || 0).toLocaleString('vi-VN')}</span>
                      <span style={{ fontSize:18 }}>🎞️</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
              {/* Frame Distribution */}
              <div style={CARD}>
                <div style={{ fontSize:13, fontWeight:700, color:'white', marginBottom:16 }}>Frame Usage Distribution</div>
                <FrameColumnChart arTotal={arTotal} photoboothTotal={pbTotal}/>
                {summary.frameUsageStats.length > 0 && (
                  <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:8 }}>
                    {summary.frameUsageStats.slice(0,5).map(f => (
                      <div key={f.frameName} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ color:'#71717a', fontSize:11, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.frameName}</span>
                        <div style={{ width:80, height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ width:`${(f.usageCount/maxFrame)*100}%`, height:'100%', background:'linear-gradient(90deg,#00d4ff,#9d50bb)', borderRadius:3 }}/>
                        </div>
                        <span style={{ color:'#52525b', fontSize:11, width:28, textAlign:'right' }}>{f.usageCount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Feedback */}
              <div style={CARD}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'white' }}>Recent Feedback</span>
                  <Link to="/b2b/fan-insights" style={{ fontSize:9, padding:'2px 7px', borderRadius:99, background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.2)', color:'#00d4ff', fontWeight:700, textDecoration:'none' }}>Xem tất cả</Link>
                </div>
                {summary.recentFeedbacks.length > 0
                  ? <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{summary.recentFeedbacks.slice(0,3).map((fb,i) => <FeedbackCard key={i} fb={fb}/>)}</div>
                  : <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:80, gap:6 }}><span style={{ fontSize:28, opacity:0.3 }}>💬</span><p style={{ color:'#52525b', fontSize:12 }}>Chưa có đánh giá</p></div>
                }
              </div>
            </div>

            {/* Rating Distribution */}
            <div style={CARD}>
              <div style={{ fontSize:13, fontWeight:700, color:'white', marginBottom:16 }}>Rating Distribution</div>
              <RatingDistChart distribution={summary.ratingDistribution}/>
            </div>

            {/* LARGE ONLY */}
            {isLarge && (
              <>
                {/* Heatmap */}
                <div style={CARD}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'white' }}>Bản đồ nhiệt hoạt động</span>
                    <span style={{ fontSize:9, padding:'2px 7px', borderRadius:99, background:'rgba(255,255,255,0.06)', color:'#71717a', fontWeight:600 }}>Theo giờ</span>
                    <span style={{ marginLeft:'auto', fontSize:10, color:'#52525b' }}>Gói Large</span>
                  </div>
                  <HeatMapChart points={report?.heatMap ?? []}/>
                </div>

                {/* Wishwall + Keywords */}
                {report && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <div style={CARD}>
                      <div style={{ fontSize:13, fontWeight:700, color:'white', marginBottom:16 }}>Phân tích cảm xúc Wishwall</div>
                      <WishwallDonut wr={report.wishwall}/>
                    </div>
                    <div style={CARD}>
                      <div style={{ fontSize:13, fontWeight:700, color:'white', marginBottom:16 }}>Từ khóa nổi bật</div>
                      {report.wishwall.topKeywords.length > 0
                        ? (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                            {report.wishwall.topKeywords.map((kw,i) => (
                              <span key={kw.keyword} style={{
                                padding:'6px 12px', borderRadius:99, fontSize:12, fontWeight:600, border:'1px solid',
                                background: i<3?'rgba(0,212,255,0.1)':'rgba(255,255,255,0.03)',
                                borderColor: i<3?'rgba(0,212,255,0.3)':'rgba(255,255,255,0.08)',
                                color: i<3?'#00d4ff':'#71717a',
                              }}>{kw.keyword} <span style={{ opacity:0.6 }}>({kw.frequency})</span></span>
                            ))}
                          </div>
                        )
                        : <p style={{ color:'#52525b', fontSize:12 }}>Chưa có từ khóa nổi bật.</p>
                      }
                    </div>
                  </div>
                )}

                {/* Export */}
                {report && (
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <button onClick={() => {
                      const blob = new Blob([JSON.stringify({summary,report},null,2)],{type:'application/json'});
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href=url; a.download=`${eventName.replace(/\s+/g,'-').toLowerCase()}-report.json`; a.click();
                      URL.revokeObjectURL(url);
                    }} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.03)', color:'#71717a', fontSize:12, cursor:'pointer' }}>
                      ⬇️ Xuất dữ liệu JSON
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </B2BLayout>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import B2BLayout from './B2BLayout';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RecentFeedback { authorName: string; authorEmail?: string; starRating: number; comment: string; createdAt: string; }

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

function FeedbackCard({ fb }: { fb: RecentFeedback }) {
  const diff = Date.now() - new Date(fb.createdAt).getTime();
  const mins = Math.floor(diff/60000);
  const timeAgo = mins < 60 ? `${mins} phút trước` : mins < 1440 ? `${Math.floor(mins/60)} giờ trước` : `${Math.floor(mins/1440)} ngày trước`;
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ color:'#d4d4d8', fontSize:14, fontWeight:600 }}>{fb.authorEmail || fb.authorName || 'Ẩn danh'}</span>
        <span style={{ color:'#52525b', fontSize:12 }}>{timeAgo}</span>
      </div>
      <StarRow rating={fb.starRating} size={16}/>
      {fb.comment && <p style={{ color:'#71717a', fontSize:13, marginTop:8, lineHeight:1.5 }}>{fb.comment}</p>}
    </div>
  );
}

const CARD: React.CSSProperties = {
  background:'rgba(255,255,255,0.025)',
  border:'1px solid rgba(255,255,255,0.07)',
  borderRadius:16,
  padding:24,
};

export default function B2BFanInsightsPage() {
  const { user } = useAuth();
  const managedEventId = user?.managedEventId;
  const [feedbacks, setFeedbacks] = useState<RecentFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!managedEventId) {
      setError('Tài khoản chưa được gán sự kiện.');
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/b2b/events/${managedEventId}/dashboard-summary`);
        const raw = res.data.data ?? res.data;
        setFeedbacks(raw.recentFeedbacks ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [managedEventId]);

  return (
    <B2BLayout>
      {loading && (
        <div style={{ display:'flex', alignItems:'center', gap:12, color:'#71717a', justifyContent:'center', paddingTop:60 }}>
          <div style={{ width:20, height:20, border:'2px solid #00d4ff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <span style={{ fontSize:13 }}>Đang tải Fan Insights...</span>
        </div>
      )}
      {error && !loading && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12, padding:'14px 20px', color:'#f87171', fontSize:13 }}>{error}</div>}

      {!loading && !error && (
        <div style={CARD}>
          <div style={{ fontSize:16, fontWeight:700, color:'white', marginBottom:24 }}>Tất cả Feedback</div>
          {feedbacks.length > 0
            ? <div style={{ display:'flex', flexDirection:'column', gap:12 }}>{feedbacks.map((fb,i) => <FeedbackCard key={i} fb={fb}/>)}</div>
            : <div style={{ textAlign:'center', padding:'60px 0', color:'#52525b', fontSize:14 }}>Chưa có feedback nào được ghi nhận.</div>
          }
        </div>
      )}
    </B2BLayout>
  );
}

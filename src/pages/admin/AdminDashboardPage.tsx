import { useEffect, useState, useCallback } from 'react';
import AdminLayout from './AdminLayout';
import { adminEventService, type ApiEvent } from '../../services/adminEventService';
import { adminFanInsightsService, type DashboardSummary } from '../../services/adminFanInsightsService';
import { 
  LineChart, Line, ResponsiveContainer, YAxis, Tooltip, 
  BarChart, Bar, XAxis, Cell 
} from 'recharts';

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Load initial events
  useEffect(() => {
    adminEventService.getAllEvents().then(data => {
      setEvents(data);
      if (data.length > 0) setSelectedEventId(data[0].id);
    });
  }, []);

  // 2. Fetch Dashboard Data
  const fetchSummary = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const data = await adminFanInsightsService.getDashboardSummary(id);
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch dashboard summary', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    fetchSummary(selectedEventId);
    const timer = setInterval(() => fetchSummary(selectedEventId), 30000);
    return () => clearInterval(timer);
  }, [selectedEventId, fetchSummary]);

  // 3. Emergency & Export actions
  const handleEmergency = async () => {
    if (!selectedEventId || !window.confirm('Bạn có chắc chắn muốn xóa toàn bộ tin nhắn đang hiện trên LED không?')) return;
    try {
      await adminFanInsightsService.clearLed(selectedEventId);
      alert('Đã xóa dữ liệu hiển thị trên LED thành công.');
      fetchSummary(selectedEventId);
    } catch {
      alert('Thao tác thất bại.');
    }
  };

  const sentimentData = summary ? [
    { name: 'Negative', value: summary.sentimentSummary['Negative'] || 0, color: '#ff5252' },
    { name: 'Neutral', value: summary.sentimentSummary['Neutral'] || 0, color: '#aaa' },
    { name: 'Positive', value: summary.sentimentSummary['Positive'] || 0, color: '#00e676' },
  ] : [];

  const frameData = summary?.frameUsageStats.map(f => ({
    name: f.frameName,
    usage: f.usageCount
  })) || [];

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column'
  };

  return (
    <AdminLayout activePage="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 800, letterSpacing: '1px' }}>
          Real-time Monitoring
        </h1>

        <select
          value={selectedEventId}
          onChange={(e) => {
            setSelectedEventId(e.target.value);
            setLoading(true);
          }}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {events.map(e => (
            <option key={e.id} value={e.id} style={{ background: '#1a1a2e' }}>{e.name}</option>
          ))}
          {!events.length && <option value="">Đang tải sự kiện...</option>}
        </select>
      </div>

      {loading && !summary ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '100px' }}>Đang tải dữ liệu giám sát...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Live Fan Sentiment Chart - Full Width Wave */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00bcd4', display: 'inline-block' }} />
                <span style={{ color: '#ccc', fontSize: '13px' }}>Live Fan Sentiment (Trend Analysis)</span>
              </div>
              <div style={{ height: '140px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sentimentData}>
                    <Tooltip 
                      contentStyle={{ background: '#1a1a2e', border: '1px solid #333', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#6c3baa" 
                      strokeWidth={3} 
                      dot={false}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', padding: '0 10px' }}>
                <div style={{ textAlign: 'center' }}>
                   <div style={{ color: '#ff5252', fontSize: '12px', fontWeight: 800 }}>Negative: {summary?.sentimentSummary['Negative'] || 0}</div>
                   <div style={{ color: '#555', fontSize: '9px' }}>Rejected/Sad</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                   <div style={{ color: '#aaa', fontSize: '12px', fontWeight: 800 }}>Neutral: {summary?.sentimentSummary['Neutral'] || 0}</div>
                   <div style={{ color: '#555', fontSize: '9px' }}>Normal info</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                   <div style={{ color: '#00e676', fontSize: '12px', fontWeight: 800 }}>Positive: {summary?.sentimentSummary['Positive'] || 0}</div>
                   <div style={{ color: '#555', fontSize: '9px' }}>Happy/Love</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Camera Frame Summary - Figma Style */}
            <div style={{...cardStyle, gap: '12px'}}>
              <div style={{ color: '#ccc', fontSize: '15px', fontWeight: 700, letterSpacing: '1px' }}>CAMERA FRAME</div>
              
              <div style={{
                background: 'rgba(0,188,212,0.1)',
                border: '1px solid rgba(0,188,212,0.2)',
                borderRadius: '8px',
                padding: '16px',
                position: 'relative',
                minHeight: '120px'
              }}>
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>Active Frames</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ color: '#00bcd4', fontSize: '56px', fontWeight: 800, lineHeight: 1 }}>{summary?.activeFramesCount}</div>
                  
                  {/* Real Frame Names Grid Box */}
                  <div style={{ 
                    border: '2px solid #00bcd4', 
                    borderRadius: '4px', 
                    padding: '8px', 
                    display: 'grid', 
                    gridTemplateColumns: '1fr', 
                    gap: '4px',
                    flex: 1,
                    maxHeight: '80px',
                    overflowY: 'auto'
                  }} className="custom-scrollbar">
                    {summary?.frameUsageStats.slice(0, 4).map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4caf50', display: 'inline-block' }} />
                        <span style={{ color: '#ccc', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                           {f.frameName}
                        </span>
                      </div>
                    ))}
                    {!summary?.frameUsageStats.length && <div style={{ color: '#444', fontSize: '10px' }}>No active frames.</div>}
                  </div>
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(233,30,140,0.2), rgba(156,39,176,0.2))',
                border: '1px solid rgba(233,30,140,0.3)',
                borderRadius: '8px',
                padding: '16px',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                   <div style={{ color: '#888', fontSize: '11px', marginBottom: '2px' }}>Total Photos Taken</div>
                   <div style={{ color: '#e91e8c', fontSize: '32px', fontWeight: 800 }}>{summary?.totalPhotos.toLocaleString() || 0}</div>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '15px' }}>
                   <div style={{ color: '#888', fontSize: '11px', marginBottom: '2px' }}>Unique Fans</div>
                   <div style={{ color: '#00bcd4', fontSize: '24px', fontWeight: 800 }}>{summary?.totalPhotographers || 0}</div>
                </div>
              </div>
            </div>

            {/* Frame Usage Analytics */}
            <div style={cardStyle}>
              <div style={{ color: '#ccc', fontSize: '13px', fontWeight: 700, marginBottom: '16px', letterSpacing: '1px' }}>FRAME USAGE (TOTAL)</div>
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={frameData} layout="vertical" margin={{ left: -20, right: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#888', fontSize: 10 }} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1a1a2e', border: 'none' }} />
                    <Bar dataKey="usage" radius={[0, 4, 4, 0]}>
                       {frameData.map((_entry, index) => (
                         <Cell key={`cell-${index}`} fill={['#00bcd4', '#2196f3', '#9c27b0', '#e91e8c'][index % 4]} />
                       ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Live Wishwall Feed */}
            <div style={cardStyle}>
              <div style={{ color: '#ccc', fontSize: '13px', fontWeight: 700, marginBottom: '8px', letterSpacing: '1px' }}>WISHWALL</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e91e8c', boxShadow: '0 0 6px #e91e8c' }} />
                <span style={{ color: '#e91e8c', fontSize: '11px', fontWeight: 700 }}>Live LED Stream</span>
              </div>

              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                height: '300px',
                overflowY: 'auto',
                padding: '8px'
              }} className="custom-scrollbar">
                {summary?.recentLiveMessages.map((msg, i) => (
                  <div key={i} style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '4px' }}>
                    <div style={{ color: '#888', fontSize: '9px', fontWeight: 700 }}>{msg.userName.toUpperCase()}</div>
                    <div style={{ color: '#ddd', fontSize: '11px', lineHeight: 1.4 }}>{msg.content}</div>
                    <div style={{ textAlign: 'right', color: '#555', fontSize: '8px' }}>{new Date(msg.createdAt).toLocaleTimeString()}</div>
                  </div>
                ))}
                {!summary?.recentLiveMessages.length && <div style={{ color: '#444', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No live messages.</div>}
              </div>
            </div>
          </div>

          {/* Global Stats bar */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: '14px', letterSpacing: '1px' }}>
              TOTAL PARTICIPANTS LOGGED : {summary?.totalParticipants || 0}
            </span>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={handleEmergency}
                style={{
                  padding: '12px 32px',
                  borderRadius: '10px',
                  border: '1px solid #00bcd4',
                  background: 'linear-gradient(90deg, #1a1a2e 0%, #a24b8b 50%, #e91e8c 100%)',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '14px',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                EMERGENCY
              </button>
              <button 
                onClick={() => window.location.href = '/admin/report'}
                style={{
                  padding: '12px 32px',
                  borderRadius: '10px',
                  border: '1px solid #00bcd4',
                  background: 'linear-gradient(90deg, #00bcd4 0%, #5c5fb4 50%, #e91e8c 100%)',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '14px',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                EXPORT DATA
              </button>
            </div>
          </div>
          
          <div style={{ color: '#444', fontSize: '11px', textAlign: 'right', marginTop: '10px', fontStyle: 'italic' }}>
            Dữ liệu tự động cập nhật mỗi 30s • Máy chủ: http://localhost:5002
          </div>
        </>
      )}
    </AdminLayout>
  );
}

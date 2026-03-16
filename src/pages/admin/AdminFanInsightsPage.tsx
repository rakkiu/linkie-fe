import { useEffect, useState, useCallback } from 'react';
import AdminLayout from './AdminLayout';
import { adminEventService } from '../../services/adminEventService';
import type { ApiEvent } from '../../services/adminEventService';
import { adminFanInsightsService } from '../../services/adminFanInsightsService';
import type { UserFanInsight, FanProfile } from '../../services/adminFanInsightsService';
import * as XLSX from 'xlsx';

// Engagement thresholds
const getEngagementLevel = (photos: number, messages: number) => {
  const total = photos + messages;
  if (total > 15) return 'High';
  if (total >= 5) return 'Medium';
  return 'Low';
};

function DonutChart({ profile }: { profile: FanProfile | null }) {
  if (!profile || !profile.framePreferences.length) {
    return (
      <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '8px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#666' }}>
        No Data
      </div>
    );
  }

  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const r = 35;
  const circ = 2 * Math.PI * r;
  
  const palette = ['#00bcd4', '#e91e8c', '#9c27b0', '#ff9800', '#4caf50'];
  let currentOffset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {profile.framePreferences.map((pref, i) => {
        const strokeDasharray = `${(pref.percentage / 100) * circ} ${circ}`;
        const strokeDashoffset = -currentOffset;
        currentOffset += (pref.percentage / 100) * circ;
        
        return (
          <circle
            key={pref.frameId}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={palette[i % palette.length]}
            strokeWidth="18"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r - 12} fill="#0a0d1a" />
    </svg>
  );
}

export default function AdminFanInsightsPage() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [insights, setInsights] = useState<UserFanInsight[]>([]);
  const [eventFrameStats, setEventFrameStats] = useState<{ frameName: string, usage: number }[]>([]);

  const [selectedFanId, setSelectedFanId] = useState<string | null>(null);
  const [profile, setProfile] = useState<FanProfile | null>(null);
  const [search, setSearch] = useState('');
  const [engagementFilter, setEngagementFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch Events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await adminEventService.getAllEvents();
        setEvents(data);
        if (data.length > 0) setSelectedEventId(data[0].id);
      } catch (err) {
        setError('Không thể tải danh sách sự kiện.');
      }
    };
    loadEvents();
  }, []);

  // 2. Fetch Insights
  const loadInsights = useCallback(async (eventId: string) => {
    if (!eventId) return;
    try {
      setLoading(true);
      const [insightsData, statsData] = await Promise.all([
        adminFanInsightsService.getFanInsights(eventId),
        adminFanInsightsService.getEventFrameStats(eventId)
      ]);
      
      console.log(`[DEBUG] Received ${insightsData.length} insights for event ${eventId}`, insightsData);
      setInsights(insightsData);
      setEventFrameStats(statsData.frames || []);

      if (insightsData.length > 0 && !selectedFanId) {
        setSelectedFanId(insightsData[0].userId);
      }
    } catch (err) {
      setError('Không thể tải dữ liệu Fan Insights.');
    } finally {
      setLoading(false);
    }
  }, [selectedFanId]);

  useEffect(() => {
    loadInsights(selectedEventId);
    // Auto refresh every 30s
    const timer = setInterval(() => loadInsights(selectedEventId), 30000);
    return () => clearInterval(timer);
  }, [selectedEventId, loadInsights]);

  // 3. Fetch Fan Profile
  useEffect(() => {
    if (!selectedEventId || !selectedFanId) return;
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const data = await adminFanInsightsService.getFanProfile(selectedEventId, selectedFanId);
        setProfile(data);
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, [selectedEventId, selectedFanId]);

  const filtered = insights.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || 
                          f.email.toLowerCase().includes(search.toLowerCase());
    const level = getEngagementLevel(f.totalPhotos, f.totalMessages);
    const matchesFilter = engagementFilter === 'All' || engagementFilter === level;
    return matchesSearch && matchesFilter;
  });

  const handleExport = () => {
    if (!insights.length) return;
    const dataToExport = insights.map(f => ({
      'Họ và tên': f.name,
      'Email': f.email,
      'Tổng số ảnh': f.totalPhotos,
      'Số tin nhắn': f.totalMessages,
      'Các Frame đã dùng': f.usedFrames,
      'Điểm tương tác': f.engagementScore.toFixed(2),
      'Mức độ': getEngagementLevel(f.totalPhotos, f.totalMessages)
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'FanInsights');
    XLSX.writeFile(wb, `FanInsights_${selectedEventId.substring(0, 8)}.xlsx`);
  };

  const headerStyle: React.CSSProperties = {
    color: '#aaa',
    fontSize: '12px',
    fontWeight: 700,
    padding: '12px 16px',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'left',
  };

  const cellStyle: React.CSSProperties = {
    padding: '12px 16px',
    color: '#ddd',
    fontSize: '13px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  };

  const palette = ['#00bcd4', '#e91e8c', '#9c27b0', '#ff9800', '#4caf50'];

  return (
    <AdminLayout activePage="fan-insights">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 800, letterSpacing: '1px', margin: 0 }}>
          FAN INSIGHTS
        </h1>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white',
              borderRadius: '6px',
              padding: '10px 14px',
              minWidth: '200px',
              fontSize: '13px',
            }}
          >
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>

          <button 
            onClick={() => loadInsights(selectedEventId)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              borderRadius: '6px',
              padding: '10px 14px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Refresh
          </button>

          <button 
            onClick={handleExport}
            disabled={!insights.length}
            style={{
              padding: '10px 24px',
              borderRadius: '4px',
              border: 'none',
              background: 'linear-gradient(135deg, #00bcd4, #e91e8c)',
              color: 'white',
              fontWeight: 800,
              fontSize: '12px',
              letterSpacing: '2px',
              cursor: insights.length ? 'pointer' : 'not-allowed',
              opacity: insights.length ? 1 : 0.5,
            }}
          >
            EXPORT EXCEL
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#ff6b6b', marginBottom: '16px' }}>{error}</div>}

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <input
            placeholder="Search by name or email"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '10px 40px 10px 16px',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
        </div>
        <select
          value={engagementFilter}
          onChange={e => setEngagementFilter(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '6px',
            padding: '10px 16px',
            color: '#aaa',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="All">Engagement: All</option>
          <option value="High">Engagement: High (&gt;15)</option>
          <option value="Medium">Engagement: Medium (5-15)</option>
          <option value="Low">Engagement: Low (&lt;5)</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        {/* Table Container */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          overflow: 'hidden',
          minHeight: '400px'
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading data...</div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <th style={headerStyle}>Họ và tên</th>
                    <th style={headerStyle}>Email</th>
                    <th style={{ ...headerStyle, textAlign: 'center' }}>Tổng ảnh</th>
                    <th style={headerStyle}>Frames đã dùng</th>
                    <th style={{ ...headerStyle, textAlign: 'center' }}>Wishes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Không tìm thấy fan nào.</td>
                    </tr>
                  ) : filtered.map((f) => (
                    <tr
                      key={f.userId}
                      onClick={() => setSelectedFanId(f.userId)}
                      style={{
                        cursor: 'pointer',
                        background: selectedFanId === f.userId ? 'rgba(0,188,212,0.1)' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={{ ...cellStyle, fontWeight: 700, color: 'white' }}>{f.name}</td>
                      <td style={cellStyle}>{f.email}</td>
                      <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 800, color: '#00bcd4' }}>{f.totalPhotos}</td>
                      <td style={{ ...cellStyle, fontSize: '11px', color: '#999' }}>{f.usedFrames || 'N/A'}</td>
                      <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 800, color: '#e91e8c' }}>{f.totalMessages}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <span style={{ color: 'white', fontWeight: 800, fontSize: '14px' }}>
                      TỔNG CỘNG: {insights.length.toLocaleString()} Fans
                    </span>
                    <span style={{ color: '#00bcd4', fontWeight: 800, fontSize: '14px' }}>
                      TỔNG ẢNH SỰ KIỆN: {insights.reduce((acc, curr) => acc + curr.totalPhotos, 0).toLocaleString()}
                    </span>
                  </div>
                  <span style={{ color: '#666', fontSize: '11px', fontStyle: 'italic' }}>Dữ liệu tự động cập nhật mỗi 30s</span>
                </div>
                
                {eventFrameStats.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#888', fontSize: '11px', fontWeight: 700, width: '100%', marginBottom: '4px', letterSpacing: '1px' }}>CHI TIẾT FRAME SỰ KIỆN:</span>
                    {eventFrameStats.map((fs, idx) => (
                      <div key={idx} style={{ 
                        background: 'rgba(255,255,255,0.04)', 
                        padding: '4px 10px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        color: '#bbb',
                        border: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        <span style={{ color: '#00bcd4', fontWeight: 700 }}>{fs.frameName}</span>: {fs.usage.toLocaleString()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Profile Sidebar */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '24px',
          position: 'sticky',
          top: '24px'
        }}>
          {profileLoading ? (
            <div style={{ color: '#666', textAlign: 'center' }}>Loading profile...</div>
          ) : profile ? (
            <>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '14px', letterSpacing: '2px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                FAN PROFILE: <span style={{ color: '#00bcd4' }}>{profile.name.toUpperCase()}</span>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ color: '#888', fontSize: '11px', fontWeight: 700, marginBottom: '16px', letterSpacing: '1px' }}>FRAME PREFERENCES</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <DonutChart profile={profile} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {profile.framePreferences.map((pref, i) => (
                      <div key={pref.frameId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: palette[i % palette.length] }} />
                        <span style={{ color: '#bbb', fontSize: '12px' }}>{pref.frameName}</span>
                        <span style={{ color: 'white', fontSize: '12px', fontWeight: 700, marginLeft: '4px' }}>{pref.percentage.toFixed(0)}%</span>
                      </div>
                    ))}
                    {!profile.framePreferences.length && <div style={{ color: '#666', fontSize: '12px' }}>Chưa có lựa chọn frame.</div>}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ color: '#888', fontSize: '11px', fontWeight: 700, marginBottom: '16px', letterSpacing: '1px' }}>WISHWALL ACTIVITY ({profile.recentMessages.length})</div>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  paddingRight: '8px',
                }} className="custom-scrollbar">
                  {profile.recentMessages.map((msg, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ 
                          color: msg.sentiment === 1 ? '#00e676' : msg.sentiment === 2 ? '#ff5252' : '#aaa', 
                          fontSize: '10px', 
                          fontWeight: 800 
                        }}>
                          {msg.sentiment === 1 ? 'POSITIVE' : msg.sentiment === 2 ? 'NEGATIVE' : 'NEUTRAL'}
                        </span>
                        <span style={{ color: '#666', fontSize: '10px' }}>
                          {new Date(msg.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ color: '#ccc', fontSize: '12px', lineHeight: 1.5 }}>{msg.content}</div>
                    </div>
                  ))}
                  {!profile.recentMessages.length && <div style={{ color: '#666', fontSize: '12px', textAlign: 'center', padding: '20px' }}>Chưa có tin nhắn.</div>}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: '#666', textAlign: 'center' }}>Chọn một fan để xem chi tiết.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

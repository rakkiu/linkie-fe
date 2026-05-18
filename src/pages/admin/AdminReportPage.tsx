import { useEffect, useMemo, useState } from 'react';
import AdminLayout from './AdminLayout';
import { adminEventService, type ApiEvent } from '../../services/adminEventService';
import { adminReportService, type EventReport, type FrameUsageItem } from '../../services/adminReportService';

function KpiCard({ title, value, subtext }: { title: string; value: string; subtext?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      <div style={{ color: 'white', fontSize: '14px', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.5px' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ color: 'white', fontSize: '28px', fontWeight: 800 }}>{value}</span>
      </div>
      {subtext && <div style={{ color: '#00bcd4', fontSize: '11px', marginTop: '6px' }}>{subtext}</div>}
    </div>
  );
}

function FrameBarChart({ frames }: { frames: FrameUsageItem[] }) {
  const maxUsage = Math.max(1, ...frames.map(f => f.usage));
  const palette = ['#00bcd4', '#2196f3', '#9c27b0', '#e91e8c', '#4caf50', '#ff9800'];

  if (!frames.length) {
    return <div style={{ color: '#7b8396', fontSize: '13px' }}>Chưa có dữ liệu frame usage.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', flex: 1 }}>
      {frames.map((frame, index) => (
        <div key={frame.frameId} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#aaa', fontSize: '13px', width: '24px', fontWeight: 600 }}>F{index + 1}</span>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '16px', overflow: 'hidden' }}>
            <div style={{ width: `${(frame.usage / maxUsage) * 100}%`, height: '100%', background: palette[index % palette.length], borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function HeatMapChart({ values }: { values: number[] }) {
  const chartValues = values.length > 1 ? values : [0, 1, 0, 2, 0, 1, 0];
  const w = 420;
  const h = 120;
  const min = Math.min(...chartValues);
  const max = Math.max(...chartValues);
  const span = max - min || 1;
  const step = w / (chartValues.length - 1);

  const points = chartValues.map((v, i) => {
    const x = i * step;
    const y = h - 10 - ((v - min) / span) * (h - 20);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%', display: 'block', minHeight: '120px' }}>
      <defs>
        <linearGradient id="heatGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e91e8c" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00bcd4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#heatGrad)" />
      <path d={linePath} fill="none" stroke="#e91e8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const formatNumber = (value: number) => value.toLocaleString('en-US');
const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatDuration = (seconds: number) => {
  if (seconds <= 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

export default function AdminReportPage() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [report, setReport] = useState<EventReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const data = await adminEventService.getAllEvents();
        setEvents(data);

        if (data.length > 0) {
          const first = data[0];
          setSelectedEventId(first.id);
        }
      } catch {
        setError('Không thể tải danh sách sự kiện.');
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;

    const loadReport = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await adminReportService.getEventReport(selectedEventId);
        setReport(data);
      } catch {
        setError('Không thể tải dữ liệu report cho sự kiện đã chọn.');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [selectedEventId]);

  const eventName = report?.eventName || events.find(e => e.id === selectedEventId)?.name || 'Event';

  const frameLegend = useMemo(() => {
    const palette = ['#00bcd4', '#2196f3', '#9c27b0', '#e91e8c', '#4caf50', '#ff9800'];
    return (report?.frameUsage.frames ?? []).map((f, i) => ({
      color: palette[i % palette.length],
      label: f.frameName,
      value: f.usage,
      key: f.frameId,
    }));
  }, [report]);

  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${report.eventName.replace(/\s+/g, '-').toLowerCase()}-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <AdminLayout activePage="report">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
        <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 800, letterSpacing: '1px', margin: 0 }}>
          BÁO CÁO {eventName.toUpperCase()}
        </h1>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: 'white',
              borderRadius: '6px',
              padding: '10px 12px',
              minWidth: '220px',
            }}
          >
            {events.length === 0 && <option value="">Không có sự kiện</option>}
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>

          <button
            onClick={handleExport}
            disabled={!report}
            style={{
              padding: '10px 24px',
              borderRadius: '4px',
              border: 'none',
              background: 'linear-gradient(135deg, #00bcd4, #e91e8c)',
              color: 'white',
              fontWeight: 800,
              fontSize: '12px',
              letterSpacing: '2px',
              cursor: report ? 'pointer' : 'not-allowed',
              opacity: report ? 1 : 0.5,
            }}
          >
            XUẤT DỮ LIỆU
          </button>
        </div>
      </div>

      {loading && <div style={{ color: '#9fa9bf', marginBottom: '16px' }}>Đang tải dữ liệu report...</div>}
      {error && <div style={{ color: '#ff6b6b', marginBottom: '16px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <KpiCard title="Tổng lưu lượng" value={formatNumber(report?.totalTraffic ?? 0)} subtext="Người tham gia" />
        <KpiCard title="Tổng tương tác" value={formatNumber(report?.totalEngagement ?? 0)} subtext="Ảnh & Lời chúc" />
        <KpiCard title="Tỷ lệ chuyển đổi" value={formatPercent(report?.conversionRate ?? 0)} subtext="Lưu lượng sang Tương tác" />
        <KpiCard title="Thời gian trung bình" value={formatDuration(report?.averageSessionSeconds ?? 0)} subtext="Thời lượng phiên ước tính" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ ...cardStyle, flex: 1 }}>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: 700, marginBottom: '24px', letterSpacing: '1px' }}>Phân tích AR Frame</div>
            <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', flex: 1 }}>
              <FrameBarChart frames={report?.frameUsage.frames ?? []} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '120px' }}>
                {frameLegend.length === 0 && <span style={{ color: '#7b8396', fontSize: '13px' }}>Không có dữ liệu frame</span>}
                {frameLegend.map(f => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: f.color, display: 'inline-block' }} />
                    <span style={{ color: '#aaa', fontSize: '13px' }}>{f.label}</span>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 600, marginLeft: 'auto' }}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: 'white', fontSize: '14px', fontWeight: 700, marginBottom: '16px', letterSpacing: '1px' }}>BẢN ĐỒ NHIỆT</div>
            <HeatMapChart values={(report?.heatMap ?? []).map(item => item.value)} />
          </div>
        </div>

        <div style={{ ...cardStyle, gap: '24px' }}>
          <div style={{ color: 'white', fontSize: '16px', fontWeight: 700, letterSpacing: '1px' }}>Phân tích Wishwall</div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', margin: '20px 0' }}>
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="60" fill="none" stroke="#e91e8c" strokeWidth="28"
                strokeDasharray={`${((report?.wishwall.negativeRate ?? 0) / 100) * 2 * Math.PI * 60} ${2 * Math.PI * 60}`}
                transform={'rotate(-90 90 90)'}
              />
              <circle cx="90" cy="90" r="60" fill="none" stroke="#00e676" strokeWidth="28"
                strokeDasharray={`${((report?.wishwall.positiveRate ?? 0) / 100) * 2 * Math.PI * 60} ${2 * Math.PI * 60}`}
                strokeDashoffset={-(((report?.wishwall.negativeRate ?? 0) / 100) * 2 * Math.PI * 60)}
                transform={'rotate(-90 90 90)'}
              />
              <circle cx="90" cy="90" r="46" fill="#0f1221" />
            </svg>
            <div style={{ position: 'absolute', right: '-10px', top: '40px', color: '#00e676', fontWeight: 800, fontSize: '14px' }}>{(report?.wishwall.positiveRate ?? 0).toFixed(1)}%</div>
            <div style={{ position: 'absolute', right: '-10px', bottom: '40px', color: '#e91e8c', fontWeight: 800, fontSize: '14px' }}>{(report?.wishwall.negativeRate ?? 0).toFixed(1)}%</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#00e676' }} />
              <span style={{ color: 'white', fontSize: '13px' }}>Nổi bật ({report?.wishwall.positiveCount ?? 0})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#e91e8c' }} />
              <span style={{ color: 'white', fontSize: '13px' }}>Từ chối ({report?.wishwall.negativeCount ?? 0})</span>
            </div>
          </div>

          <div>
            <div style={{ color: 'white', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Từ khóa hàng đầu</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {(report?.wishwall.topKeywords ?? []).map((keyword, i) => (
                <div key={`${keyword.keyword}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00bcd4' }} />
                  <span style={{ color: '#ccc', fontSize: '13px' }}>{keyword.keyword} ({keyword.frequency})</span>
                </div>
              ))}
              {(report?.wishwall.topKeywords ?? []).length === 0 && (
                <span style={{ color: '#7b8396', fontSize: '13px' }}>Chưa có từ khóa.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

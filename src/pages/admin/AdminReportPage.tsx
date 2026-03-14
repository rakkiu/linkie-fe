import AdminLayout from './AdminLayout';

function KpiCard({ title, value, subtext }: { title: string, value: string, subtext?: string }) {
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

// Reused simple bars
function BarChart() {
  const bars = [
    { label: 'F1', value: 100, max: 124, color: '#00bcd4' },
    { label: 'F2', value: 24, max: 124, color: '#2196f3' },
    { label: 'F3', value: 20, max: 124, color: '#9c27b0' },
    { label: 'F4', value: 124, max: 124, color: '#e91e8c' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', flex: 1 }}>
      {bars.map(bar => (
        <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#aaa', fontSize: '13px', width: '24px', fontWeight: 600 }}>{bar.label}</span>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '16px', overflow: 'hidden' }}>
            <div style={{ width: `${(bar.value / bar.max) * 100}%`, height: '100%', background: bar.color, borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Animated heat map line chart
function HeatMapChart() {
  const points = [40, 45, 30, 60, 35, 20, 25, 40, 45, 60, 70, 50, 65, 55, 60, 40];
  const w = 400; const h = 100;
  const min = Math.min(...points); const max = Math.max(...points);
  const normalize = (v: number) => h - 10 - ((v - min) / (max - min)) * (h - 20);
  const step = w / (points.length - 1);
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'S'} ${Math.max(0, i * step - 10)} ${normalize(p)}, ${i * step} ${normalize(p)}`).join(' ');
  
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%', display: 'block', minHeight: '120px' }}>
      <defs>
        <linearGradient id="heatGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e91e8c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00bcd4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pathD + ` L ${(points.length - 1) * step} ${h} L 0 ${h} Z`} fill="url(#heatGrad)" />
      <path d={pathD} fill="none" stroke="#e91e8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AdminReportPage() {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 800, letterSpacing: '1px', margin: 0 }}>
          NIGHT FESTIVAL REPORT
        </h1>
        <button style={{
          padding: '10px 24px',
          borderRadius: '4px',
          border: 'none',
          background: 'linear-gradient(135deg, #00bcd4, #e91e8c)',
          color: 'white',
          fontWeight: 800,
          fontSize: '12px',
          letterSpacing: '2px',
          cursor: 'pointer',
        }}>
          EXPORT DATA
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <KpiCard title="Total Traffic" value="12,450" subtext="+14% vs last event" />
        <KpiCard title="Total Engagement" value="8,920" subtext="Photos & Wishes" />
        <KpiCard title="Conversion Rate" value="71.6%" subtext="Traffic to Engagement" />
        <KpiCard title="Average time on website" value="14m 20s" subtext="Session duration" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Camera Frame Analytics */}
          <div style={{ ...cardStyle, flex: 1 }}>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: 700, marginBottom: '24px', letterSpacing: '1px' }}>Camera Frame Analytics</div>
            <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', flex: 1 }}>
              <BarChart />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '120px' }}>
                {[
                  { color: '#00bcd4', label: 'Frame 1', val: 100 },
                  { color: '#2196f3', label: 'Frame 2', val: 24 },
                  { color: '#9c27b0', label: 'Frame 3', val: 20 },
                  { color: '#e91e8c', label: 'Frame 4', val: 124 },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: f.color, display: 'inline-block' }} />
                    <span style={{ color: '#aaa', fontSize: '13px' }}>{f.label}</span>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 600, marginLeft: 'auto' }}>{f.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HEAT MAP */}
          <div style={cardStyle}>
            <div style={{ color: 'white', fontSize: '14px', fontWeight: 700, marginBottom: '16px', letterSpacing: '1px' }}>HEAT MAP</div>
            <HeatMapChart />
          </div>
        </div>

        {/* Wishwall Analytics */}
        <div style={{ ...cardStyle, gap: '24px' }}>
          <div style={{ color: 'white', fontSize: '16px', fontWeight: 700, letterSpacing: '1px' }}>Wishwall Analytics</div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', margin: '20px 0' }}>
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="60" fill="none" stroke="#e91e8c" strokeWidth="28"
                strokeDasharray={`${0.2 * 2 * Math.PI * 60} ${2 * Math.PI * 60}`}
                transform={`rotate(-90 90 90)`}
              />
              <circle cx="90" cy="90" r="60" fill="none" stroke="#00e676" strokeWidth="28"
                strokeDasharray={`${0.8 * 2 * Math.PI * 60} ${2 * Math.PI * 60}`}
                strokeDashoffset={-(0.2 * 2 * Math.PI * 60)}
                transform={`rotate(-90 90 90)`}
              />
              <circle cx="90" cy="90" r="46" fill="#0f1221" />
            </svg>
            <div style={{ position: 'absolute', right: '-10px', top: '40px', color: '#00e676', fontWeight: 800, fontSize: '14px' }}>80%</div>
            <div style={{ position: 'absolute', right: '-10px', bottom: '40px', color: '#e91e8c', fontWeight: 800, fontSize: '14px' }}>20%</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#00e676' }} />
              <span style={{ color: 'white', fontSize: '13px' }}>Tích cực</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#e91e8c' }} />
              <span style={{ color: 'white', fontSize: '13px' }}>Tiêu cực</span>
            </div>
          </div>

          <div>
            <div style={{ color: 'white', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Top Keywords</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { word: 'Tuyệt vời', color: '#00bcd4' },
                { word: 'ahhhhh', color: '#00bcd4' },
                { word: 'Xuất sắc', color: '#00bcd4' },
                { word: 'Cảm động', color: '#00bcd4' },
              ].map((k, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: k.color }} />
                  <span style={{ color: '#ccc', fontSize: '13px' }}>{k.word}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

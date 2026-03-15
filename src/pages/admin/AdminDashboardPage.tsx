import { useEffect, useRef, useState } from 'react';
import AdminLayout from './AdminLayout';

// Animated line chart SVG
function LiveChart({ color = '#00bcd4', height = 80 }: { color?: string; height?: number }) {
  const points = [20,45,30,60,35,55,25,70,40,50,30,65,35,45,55,40,60,30,50,45,35,60,40,55,30,65,45,35,55,40];
  const w = 600;
  const h = height;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const normalize = (v: number) => h - 8 - ((v - min) / (max - min)) * (h - 16);
  const step = w / (points.length - 1);
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${normalize(p)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: `${h}px`, display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pathD + ` L ${(points.length - 1) * step} ${h} L 0 ${h} Z`}
        fill={`url(#grad-${color.replace('#','')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Horizontal bar chart
function BarChart() {
  const bars = [
    { label: 'F1', value: 100, max: 124, color: '#00bcd4' },
    { label: 'F2', value: 24, max: 124, color: '#2196f3' },
    { label: 'F3', value: 20, max: 124, color: '#9c27b0' },
    { label: 'F4', value: 124, max: 124, color: '#e91e8c' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {bars.map(bar => (
        <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#aaa', fontSize: '12px', width: '20px', fontWeight: 600 }}>{bar.label}</span>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '3px', height: '14px', overflow: 'hidden' }}>
            <div style={{
              width: `${(bar.value / bar.max) * 100}%`,
              height: '100%',
              background: bar.color,
              borderRadius: '3px',
              transition: 'width 1s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Wishwall messages
const wishMessages = [
  'Hát bài Special song đi ạ, em chờ bài này giờ',
  'Happy Anniversary 5 years! Chúc nhóm luôn tỏa sáng',
  'Một đêm không thể quên, cảm ơn BTC rất nhiều.',
  'Tuyệt vời quá! Đêm nay hoàn hảo không thể tin được!',
  'Anh ơi nhìn sang trái đi, em ở đây nè! 💜',
  'Cảm ơn vì đã mang lại kỉ niệm đẹp cho chúng em!',
];

export default function AdminDashboardPage() {
  const [msgCount, setMsgCount] = useState(27);
  const [totalParticipants] = useState(5700);
  const msgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgCount(c => c + Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '16px',
  };

  return (
    <AdminLayout activePage="dashboard">
      <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 800, marginBottom: '20px', letterSpacing: '1px' }}>
        Real-time Monitoring
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', marginBottom: '16px' }}>
        {/* Live Fan Sentiment */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00bcd4', display: 'inline-block' }} />
            <span style={{ color: '#ccc', fontSize: '13px' }}>Live Fan Sentiment</span>
          </div>
          <LiveChart color="#6c3baa" height={100} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ color: '#888', fontSize: '11px' }}>Positive</span>
            <span style={{ color: '#00bcd4', fontSize: '11px', fontWeight: 700 }}>90%</span>
          </div>
        </div>

        {/* Web Latency card */}
        <div style={{
          background: 'linear-gradient(135deg, #00bcd4, #0097a7)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '140px',
        }}>
          <LiveChart color="rgba(255,255,255,0.8)" height={60} />
          <div>
            <div style={{ color: 'white', fontSize: '11px', fontWeight: 700 }}>Web Latency Fluctuations</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px' }}>(Peak Performance: Min 15-45)</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Camera Frame */}
        <div style={cardStyle}>
          <div style={{ color: '#ccc', fontSize: '13px', fontWeight: 700, marginBottom: '12px', letterSpacing: '1px' }}>CAMERA FRAME</div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,188,212,0.2), rgba(0,188,212,0.05))',
            border: '1px solid rgba(0,188,212,0.3)',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '10px',
          }}>
            <div style={{ color: '#888', fontSize: '10px', marginBottom: '6px' }}>Active Frames</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#00bcd4', fontSize: '36px', fontWeight: 800 }}>4</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {[{label:'F1',c:'#4caf50'},{label:'F2',c:'#4caf50'},{label:'F3',c:'#4caf50'},{label:'F4',c:'#4caf50'}].map(f => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: f.c, display: 'inline-block' }} />
                    <span style={{ color: '#ccc', fontSize: '10px' }}>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #e91e8c, #9c27b0)',
            borderRadius: '6px',
            padding: '12px',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px', marginBottom: '4px' }}>Total Photos Taken</div>
            <div style={{ color: 'white', fontSize: '24px', fontWeight: 800 }}>1,248</div>
          </div>
        </div>

        {/* Frame Usage Bar Chart */}
        <div style={cardStyle}>
          <div style={{ color: '#ccc', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>Frame Usage (Total)</div>
          <BarChart />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '12px' }}>
            {[
              { color: '#00bcd4', label: 'Frame 1', val: 100 },
              { color: '#2196f3', label: 'Frame 2', val: 24 },
              { color: '#9c27b0', label: 'Frame 3', val: 20 },
              { color: '#e91e8c', label: 'Frame 4', val: 124 },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: f.color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: '#aaa', fontSize: '10px' }}>{f.label}</span>
                <span style={{ color: 'white', fontSize: '10px', marginLeft: 'auto' }}>{f.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* WISHWALL */}
        <div style={cardStyle}>
          <div style={{ color: '#ccc', fontSize: '13px', fontWeight: 700, marginBottom: '8px', letterSpacing: '1px' }}>WISHWALL</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e91e8c', boxShadow: '0 0 6px #e91e8c', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ color: '#e91e8c', fontSize: '11px', fontWeight: 700 }}>Live LED</span>
          </div>

          {/* Scrolling messages */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            height: '140px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div
              ref={msgRef}
              style={{
                animation: 'scrollUp 12s linear infinite',
              }}
            >
              {[...wishMessages, ...wishMessages].map((msg, i) => (
                <div key={i} style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: '#888', fontSize: '9px' }}>Message Text</div>
                  <div style={{ color: '#ddd', fontSize: '10px', lineHeight: 1.4 }}>{msg}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'right', color: '#00bcd4', fontSize: '12px', fontWeight: 700, marginTop: '6px' }}>
            +{msgCount}/min
          </div>
        </div>
      </div>

      {/* Footer bar */}
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
          TOTAL PARTICIPANTS LOGGED : {totalParticipants.toLocaleString()}
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{
            padding: '8px 24px',
            borderRadius: '4px',
            border: '2px solid #e91e8c',
            background: 'transparent',
            color: 'white',
            fontWeight: 800,
            fontSize: '12px',
            letterSpacing: '2px',
            cursor: 'pointer',
          }}>
            EMERGENCY
          </button>
          <button style={{
            padding: '8px 24px',
            borderRadius: '4px',
            border: 'none',
            background: 'linear-gradient(135deg, #00bcd4, #0097a7)',
            color: 'white',
            fontWeight: 800,
            fontSize: '12px',
            letterSpacing: '2px',
            cursor: 'pointer',
          }}>
            EXPORT DATA
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

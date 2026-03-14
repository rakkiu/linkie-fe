import { useState } from 'react';
import AdminLayout from './AdminLayout';

const fans = [
  { name: 'Nguyễn Thu Thảo', email: 'thaonguyen@gmail.com', photos: 12, frames: 'Frame 1 (8), Frame 3 (4)', messages: 6 },
  { name: 'Trần Hoàng Nam', email: 'namth@gmail.com', photos: 7, frames: 'Frame 2 (7)', messages: 2 },
  { name: 'Lê Minh Anh', email: 'minhanhle@gmail.com', photos: 11, frames: 'Frame 3 (11)', messages: 5 },
  { name: 'Phạm Đức Huy', email: 'huypham@gmail.com', photos: 23, frames: 'Frame 1 (10), Frame 2 (10), Frame 4 (3)', messages: 10 },
  { name: 'Hoàng Thanh Trúc', email: 'truchoang@gmail.com', photos: 26, frames: 'Frame 2 (12), Frame 4 (14)', messages: 2 },
  { name: 'Vũ Minh Quang', email: 'quangvu@gmail.com', photos: 5, frames: 'Frame 1 (5)', messages: 3 },
];

const wishwallMessages = [
  { time: '20:01 PM', text: 'Hát bài Special song đi ạ, em chờ bài này giờ' },
  { time: '20:13 PM', text: 'Happy Anniversary 5 years! Chúc nhóm luôn tỏa sáng' },
  { time: '20:42 PM', text: 'Một đêm không thể quên, cảm ơn BTC rất nhiều.' },
];

// Simple donut chart
function DonutChart() {
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const r = 35;
  const circ = 2 * Math.PI * r;
  const frame1Percent = 0.6;
  const frame2Percent = 0.4;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Frame 2 (pink) */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e91e8c" strokeWidth="18"
        strokeDasharray={`${frame2Percent * circ} ${circ}`}
        strokeDashoffset={0}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Frame 1 (cyan) */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#00bcd4" strokeWidth="18"
        strokeDasharray={`${frame1Percent * circ} ${circ}`}
        strokeDashoffset={-(frame2Percent * circ)}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <circle cx={cx} cy={cy} r={r - 12} fill="#0a0d1a" />
    </svg>
  );
}

export default function AdminFanInsightsPage() {
  const [search, setSearch] = useState('');
  const [selectedFan, setSelectedFan] = useState(fans[0]);
  const [engagement, setEngagement] = useState('All');

  const filtered = fans.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.email.toLowerCase().includes(search.toLowerCase())
  );

  const headerStyle: React.CSSProperties = {
    color: '#aaa',
    fontSize: '12px',
    fontWeight: 700,
    padding: '10px 12px',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'left',
  };

  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    color: '#ddd',
    fontSize: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  };

  return (
    <AdminLayout activePage="fan-insights">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 800, letterSpacing: '1px', margin: 0 }}>
          FAN INSIGHTS - AUDIENCE ENGAGEMENT
        </h1>
        <button style={{
          padding: '10px 28px',
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

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
          <input
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              padding: '8px 36px 8px 14px',
              color: 'white',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '14px' }}>🔍</span>
        </div>
        <select
          value={engagement}
          onChange={e => setEngagement(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '6px',
            padding: '8px 14px',
            color: '#aaa',
            fontSize: '12px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="All">Engagement: All</option>
          <option value="High">Engagement: High</option>
          <option value="Medium">Engagement: Medium</option>
          <option value="Low">Engagement: Low</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px' }}>
        {/* Table */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '13px', letterSpacing: '1px' }}>
              FAN LIST &amp; BEHAVIOR DATA
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={headerStyle}>Họ và tên</th>
                <th style={headerStyle}>Email</th>
                <th style={{ ...headerStyle, textAlign: 'center' }}>Tổng số hình đã chụp</th>
                <th style={headerStyle}>Các Frame đã sử dụng</th>
                <th style={{ ...headerStyle, textAlign: 'center' }}>Số tin nhắn Wishwall</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fan, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedFan(fan)}
                  style={{
                    cursor: 'pointer',
                    background: selectedFan.email === fan.email ? 'rgba(0,188,212,0.08)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => { if (selectedFan.email !== fan.email) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={(e) => { if (selectedFan.email !== fan.email) e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ ...cellStyle, fontWeight: 600, color: 'white' }}>{fan.name}</td>
                  <td style={cellStyle}>{fan.email}</td>
                  <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 700, color: '#00bcd4' }}>{fan.photos}</td>
                  <td style={cellStyle}>{fan.frames}</td>
                  <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 700, color: '#e91e8c' }}>{fan.messages}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '13px' }}>Tổng số lượng : {fans.length.toLocaleString()}.700</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#00bcd4', fontSize: '11px', fontWeight: 700 }}>Data updated realtime</div>
              <div style={{ color: '#666', fontSize: '10px', fontStyle: 'italic' }}>Dữ liệu được cập nhật realtime từ Website Linkle</div>
            </div>
          </div>
        </div>

        {/* Fan Profile Panel */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '16px',
        }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: '12px', letterSpacing: '1px', marginBottom: '10px' }}>
            FAN PROFILE : {selectedFan.name.toUpperCase()}
          </div>

          <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '8px' }}>Số thích cá nhân (Frame Preference)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <DonutChart />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00bcd4', display: 'inline-block' }} />
                <span style={{ color: '#ccc', fontSize: '11px' }}>Frame 1</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e91e8c', display: 'inline-block' }} />
                <span style={{ color: '#ccc', fontSize: '11px' }}>Frame 2</span>
              </div>
            </div>
          </div>

          <div style={{ color: '#aaa', fontSize: '11px', marginBottom: '8px', fontWeight: 700 }}>Hoạt động Wishwall</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {wishwallMessages.map((msg, i) => (
              <div key={i} style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                padding: '8px 10px',
              }}>
                <div style={{ color: '#888', fontSize: '9px', marginBottom: '3px' }}>
                  Message Text <span style={{ float: 'right' }}>{msg.time}</span>
                </div>
                <div style={{ color: '#ccc', fontSize: '11px', lineHeight: 1.4 }}>{msg.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LKLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="url(#logoGrad)" />
    <text x="8" y="22" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial">LL</text>
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
        <stop offset="0%" stopColor="#00bcd4" />
        <stop offset="100%" stopColor="#e91e8c" />
      </linearGradient>
    </defs>
  </svg>
);

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage: 'dashboard' | 'events' | 'fan-insights' | 'report' | 'create-event' | 'wishwall-moderation';
}

export default function AdminLayout({ children, activePage }: AdminLayoutProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavItems = [
    { id: 'dashboard', label: 'DASHBOARD', path: '/admin', roles: ['admin'] },
    { id: 'events', label: 'EVENTS', path: '/admin/events', roles: ['admin', 'staff'] },
    { id: 'fan-insights', label: 'FAN INSIGHTS', path: '/admin/fan-insights', roles: ['admin'] },
    { id: 'report', label: 'REPORT', path: '/admin/report', roles: ['admin'] },
    { id: 'create-event', label: 'CREATE EVENT', path: '/admin/create-event', roles: ['admin'] },
    { id: 'wishwall-moderation', label: 'WISHWALL', path: '/admin/wishwall-moderation', roles: ['admin', 'staff'] },
  ];

  const navItems = allNavItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1221', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: '180px',
        minWidth: '180px',
        background: '#0a0d1a',
        borderRight: '1px solid rgba(0,188,212,0.15)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        gap: '8px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', paddingLeft: '4px' }}>
          <LKLogo />
          <div>
            <div style={{ color: '#00bcd4', fontWeight: 800, fontSize: '13px', lineHeight: 1 }}>Linkle</div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '10px', letterSpacing: '2px' }}>ADMIN</div>
          </div>
        </div>

        {/* Nav items */}
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              style={{
                display: 'block',
                padding: '10px 14px',
                borderRadius: '6px',
                border: isActive ? 'none' : '1px solid rgba(0,188,212,0.3)',
                background: isActive ? 'linear-gradient(135deg, #e91e8c, #9c27b0)' : 'transparent',
                color: 'white',
                fontWeight: 700,
                fontSize: '11px',
                letterSpacing: '1.5px',
                textDecoration: 'none',
                textAlign: 'center',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </NavLink>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Log Out */}
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent',
            color: 'white',
            fontWeight: 700,
            fontSize: '11px',
            letterSpacing: '1.5px',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          LOG OUT
        </button>

        {/* System Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px', marginTop: '8px' }}>
          <span style={{ color: '#aaa', fontSize: '10px', fontWeight: 600 }}>SYSTEM STATUS :</span>
          <span style={{ color: '#4caf50', fontSize: '10px', fontWeight: 700 }}>ONLINE</span>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#4caf50',
            boxShadow: '0 0 6px #4caf50',
            animation: 'pulse 2s infinite',
          }} />
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {children}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes waveAnim {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scrollUp {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes shimmer {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0d1a; }
        ::-webkit-scrollbar-thumb { background: rgba(0,188,212,0.4); border-radius: 2px; }
      `}</style>
    </div>
  );
}

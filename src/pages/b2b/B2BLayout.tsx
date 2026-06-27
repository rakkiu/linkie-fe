import { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface B2BLayoutProps {
  children: ReactNode;
}

export default function B2BLayout({ children }: B2BLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  // Dựa vào PlanTier để ẩn hiện menu
  const planTier = user.planTier?.toLowerCase() || 'students';
  const hasDashboard = planTier === 'medium' || planTier === 'large';
  const hasFanInsights = planTier === 'medium' || planTier === 'large';

  const menuItems = [
    ...(hasDashboard
      ? [{ path: '/b2b/dashboard', label: 'Dashboard', icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
          </svg>
        ) }]
      : []),
    { path: '/b2b/ar-frames', label: 'Camera AR', icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
      ) },
    { path: '/b2b/photobooth', label: 'Photobooth', icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    ) },
    { path: '/b2b/wishwall', label: 'Wishwall', icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      ) },
    ...(hasFanInsights
      ? [{ path: '/b2b/fan-insights', label: 'Fan Insights', icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        ) }]
      : [])
  ];

  return (
    <div className="flex h-screen bg-[#0F0F13] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#18181C] border-r border-white/5 flex flex-col transition-all duration-300">
        <div className="p-6 flex items-center gap-2 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => navigate('/b2b')}>
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
            Linkie
          </span>
          <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 bg-white/10 rounded-full uppercase tracking-wider">Organizer</span>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-600/10 text-violet-400 font-semibold'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white font-medium'
                }`}
              >
                {item.icon}
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-3 bg-white/5 rounded-xl mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-sm font-bold uppercase shadow-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{user.name}</div>
              <div className="text-xs text-violet-400 font-medium truncate uppercase tracking-wider">
                {planTier} PLAN
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors text-sm font-medium"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Topbar (Optional) */}
        <header className="h-16 bg-[#18181C]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8 shrink-0 z-10">
          <h1 className="text-lg font-bold">
            {menuItems.find(m => location.pathname.startsWith(m.path))?.label || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto relative">
          <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-violet-600/5 to-transparent pointer-events-none" />
          <div className="p-8 relative z-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

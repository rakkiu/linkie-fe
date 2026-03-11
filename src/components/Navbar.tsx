import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavLKIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="navGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00e5ff" />
        <stop offset="1" stopColor="#e91e8c" />
      </linearGradient>
    </defs>
    {/* Star rays */}
    <line x1="16" y1="2" x2="16" y2="8" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="16" y1="24" x2="16" y2="30" stroke="#e91e8c" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="2" y1="16" x2="8" y2="16" stroke="#e91e8c" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="24" y1="16" x2="30" y2="16" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="5" y1="5" x2="9" y2="9" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="27" y1="27" x2="23" y2="23" stroke="#e91e8c" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="27" y1="5" x2="23" y2="9" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="5" y1="27" x2="9" y2="23" stroke="#e91e8c" strokeWidth="1.5" strokeLinecap="round" />
    {/* LK letters */}
    <path d="M7 11 L7 21 L11 21" stroke="url(#navGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 11 L14 21 M14 16 L22 11 M14 16 L22 21" stroke="url(#navGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    setShowMenu(false);
    await logout();
    navigate('/');
  };

  return (
    <>
      <nav className="flex items-center justify-between px-4 py-3 bg-[#0a0a1a]/90 backdrop-blur-md fixed top-0 left-0 right-0 z-50 border-b border-white/5">
        <Link to="/" className="flex items-center">
          <NavLKIcon />
        </Link>

        <div className="flex gap-5 text-sm font-medium text-gray-200">
          <Link to="/" className="hover:text-white transition-colors">
            Trang chủ
          </Link>
          <a href="/#about" className="hover:text-white transition-colors">
            Về chúng tôi
          </a>
        </div>

        {user ? (
          <button
            onClick={() => setShowMenu(true)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00bcd4] to-[#e91e8c] flex items-center justify-center hover:opacity-80 transition-opacity text-white text-xs font-bold"
            title="Tài khoản"
          >
            {user.name.charAt(0).toUpperCase()}
          </button>
        ) : (
          <Link
            to="/login"
            className="text-white text-xs font-bold tracking-wide hover:text-gray-300 transition-colors"
          >
            ĐĂNG NHẬP
          </Link>
        )}
      </nav>

      {/* Profile menu overlay */}
      {showMenu && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={() => setShowMenu(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Menu card */}
          <div
            className="relative w-[85%] max-w-sm bg-[#12122a] rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient header */}
            <div className="h-28 bg-gradient-to-br from-[#00e5ff] via-[#6a3fa0] to-[#e91e8c]" />

            {/* Menu items */}
            <div className="px-6 py-5">
              <button
                onClick={() => { setShowMenu(false); navigate('/change-password'); }}
                className="w-full text-center text-white font-semibold text-base py-3 hover:text-[#00e5ff] transition-colors"
              >
                Thay đổi mật khẩu
              </button>
              <button
                onClick={() => { setShowMenu(false); navigate('/library'); }}
                className="w-full text-center text-white font-semibold text-base py-3 hover:text-[#00e5ff] transition-colors"
              >
                Thư viện của tôi
              </button>

              <div className="border-t border-white/15 my-1" />

              {/* Action buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowMenu(false)}
                  className="flex-1 py-2.5 rounded-full border border-white/40 text-white text-xs font-bold tracking-widest hover:border-white transition-colors"
                >
                  QUAY LẠI
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-[#e91e8c] to-[#c2185b] text-white text-xs font-bold tracking-widest hover:opacity-90 transition-opacity"
                >
                  ĐĂNG XUẤT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

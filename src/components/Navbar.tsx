import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoLinkie from '../image/logo-linkie-black.png';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate('/');
  }

  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-[#0a0a1a]/90 backdrop-blur-md fixed top-0 left-0 right-0 z-50 border-b border-white/5">
      <Link to="/" className="flex items-center gap-2">
        <img
          src={logoLinkie}
          alt="Linkie logo"
          className="h-8 w-auto object-contain"
        />
        <div style={{ color: '#00bcd4', fontWeight: 800, fontSize: '14px', lineHeight: 1 }}>Linkie</div>
      </Link>

      <div className="flex gap-5 text-sm font-medium text-gray-200">
        <Link to="/" className="hover:text-white transition-colors">
          Trang chủ
        </Link>
        <Link to="/events" className="hover:text-white transition-colors">
          Sự kiện
        </Link>
        {(user?.role === 'admin' || user?.role === 'staff') && (
          <Link to="/staff/wishwall" className="text-purple-400 hover:text-purple-300 transition-colors">
            Duyệt Wishwall
          </Link>
        )}
        {(user?.role === 'admin' || user?.role === 'led') && (
          <Link to="/led" className="text-teal-400 hover:text-teal-300 transition-colors">
            Màn hình LED
          </Link>
        )}
        <a href="/#about" className="hover:text-white transition-colors">
          Về chúng tôi
        </a>
      </div>

      {user ? (
        <div className="relative" ref={menuRef}>
          {/* Avatar button */}
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00bcd4] to-[#e91e8c] flex items-center justify-center hover:opacity-80 transition-opacity text-white text-xs font-bold"
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#12122a] border border-white/10 shadow-2xl overflow-hidden z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00bcd4] to-[#e91e8c] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                    <p className="text-gray-400 text-xs truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  to="/change-password"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
                  </svg>
                  Đổi mật khẩu
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Link
          to="/login"
          className="text-white text-xs font-bold tracking-wide hover:text-gray-300 transition-colors"
        >
          ĐĂNG NHẬP
        </Link>
      )}
    </nav>
  );
}

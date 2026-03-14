import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoLinkieBlack from '../image/logo-linkie-black.png';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-[#0a0a1a]/90 backdrop-blur-md fixed top-0 left-0 right-0 z-50 border-b border-white/5">
      <Link to="/" className="flex items-center gap-2">
        <img
          src="/image.png"
          alt="Linkle logo"
          className="h-8 w-auto object-contain"
        />
        <div style={{ color: '#00bcd4', fontWeight: 800, fontSize: '14px', lineHeight: 1 }}>Linkle</div>
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
          onClick={() => { logout(); navigate('/'); }}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00bcd4] to-[#e91e8c] flex items-center justify-center hover:opacity-80 transition-opacity text-white text-xs font-bold"
          title="Đăng xuất"
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
  );
}

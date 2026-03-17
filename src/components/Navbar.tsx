import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoIcon from '../image/logo-linkie-black.png';
import logoText from '../image/Linkie.png';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="flex items-center justify-between px-4 py-2 bg-[#0a0a1a]/90 backdrop-blur-md fixed top-0 left-0 right-0 z-50 border-b border-white/5 h-16">
      <Link to="/" className="flex flex-col items-center justify-center leading-none h-full">
        <img
          src={logoIcon}
          alt="Linkie icon"
          className="h-7 sm:h-8 w-auto object-contain"
        />
        <img 
          src={logoText}
          alt="Linkie text"
          className="h-2.5 sm:h-3 w-auto object-contain mt-1"
        />
      </Link>

      <div className="flex items-center gap-5 text-sm font-medium text-gray-400 overflow-x-auto scrollbar-hide py-1 px-2 h-full">
        <Link 
          to="/" 
          className={`transition-colors whitespace-nowrap h-full flex items-center border-b-2 ${
            isActive('/') ? 'text-white border-[#e91e8c]' : 'border-transparent hover:text-white'
          }`}
        >
          Trang chủ
        </Link>
        <Link 
          to="/events" 
          className={`transition-colors whitespace-nowrap h-full flex items-center border-b-2 ${
            isActive('/events') ? 'text-white border-[#e91e8c]' : 'border-transparent hover:text-white'
          }`}
        >
          Sự kiện
        </Link>
        {(user?.role === 'admin' || user?.role === 'staff') && (
          <Link 
            to="/staff/wishwall" 
            className={`transition-colors whitespace-nowrap h-full flex items-center border-b-2 ${
              isActive('/staff/wishwall') ? 'text-purple-400 border-[#e91e8c]' : 'text-purple-400/70 border-transparent hover:text-purple-300'
            }`}
          >
            Duyệt Wishwall
          </Link>
        )}
        {(user?.role === 'admin' || user?.role === 'led') && (
          <Link 
            to="/led" 
            className={`transition-colors whitespace-nowrap h-full flex items-center border-b-2 ${
              isActive('/led') ? 'text-teal-400 border-[#e91e8c]' : 'text-teal-400/70 border-transparent hover:text-teal-300'
            }`}
          >
            Màn hình LED
          </Link>
        )}
        <a 
          href="/#about" 
          className="hover:text-white transition-colors whitespace-nowrap h-full flex items-center border-b-2 border-transparent text-gray-400"
        >
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

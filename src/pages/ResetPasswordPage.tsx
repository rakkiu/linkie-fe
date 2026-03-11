import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Token is usually provided via query string: /reset-password?token=xxx
  useEffect(() => {
    const t = searchParams.get('token') ?? '';
    setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setError('Token không hợp lệ hoặc đã hết hạn.'); return; }
    if (!newPassword || !confirmPassword) { setError('Vui lòng nhập đầy đủ thông tin.'); return; }
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp.'); return; }
    if (newPassword.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }

    setError('');
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Có lỗi xảy ra. Token có thể đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col">
      <div
        className="flex-shrink-0 h-[35vh]"
        style={{ background: 'linear-gradient(180deg, #00bcd4 0%, #6c3baa 60%, #1a1030 100%)' }}
      />

      <div className="flex-1 bg-[#0f1221] rounded-t-[2rem] -mt-8 px-6 pt-8 pb-6 flex flex-col">
        <h1 className="text-2xl font-black text-white tracking-wider mb-2">ĐẶT LẠI MẬT KHẨU</h1>
        <p className="text-gray-400 text-sm mb-7">Nhập mật khẩu mới cho tài khoản của bạn.</p>

        {success ? (
          <div className="flex flex-col gap-4">
            <p className="text-green-400 text-sm text-center bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3">
              Mật khẩu đã được đặt lại thành công! Đang chuyển hướng đến trang đăng nhập...
            </p>
            <Link
              to="/login"
              className="w-full text-center font-bold tracking-widest text-sm py-3 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #e91e8c, #9c27b0)' }}
            >
              ĐĂNG NHẬP NGAY
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 outline-none focus:border-[#00bcd4] transition-colors"
            />
            <input
              type="password"
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 outline-none focus:border-[#00bcd4] transition-colors"
            />

            {error && <p className="text-red-400 text-xs text-center">{error}</p>}

            <div className="flex gap-3 mt-1">
              <Link
                to="/login"
                className="flex-1 text-center border border-[#00bcd4] text-white font-bold tracking-widest text-sm py-3 rounded-full hover:bg-[#00bcd4]/10 transition-all"
              >
                QUAY LẠI
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 font-bold tracking-widest text-sm py-3 rounded-full text-white active:scale-[0.98] transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #e91e8c, #9c27b0)' }}
              >
                {loading ? '...' : 'XÁC NHẬN'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

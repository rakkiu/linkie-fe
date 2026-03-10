import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Vui lòng nhập email.'); return; }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess('Link đặt lại mật khẩu đã được gửi đến email của bạn.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Có lỗi xảy ra. Vui lòng thử lại.');
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
        <h1 className="text-2xl font-black text-white tracking-wider mb-2">QUÊN MẬT KHẨU</h1>
        <p className="text-gray-400 text-sm mb-7">
          Nhập email của bạn để nhận link đặt lại mật khẩu.
        </p>

        {success ? (
          <div className="flex flex-col gap-4">
            <p className="text-green-400 text-sm text-center bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3">
              {success}
            </p>
            <Link
              to="/login"
              className="w-full text-center font-bold tracking-widest text-sm py-3 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #e91e8c, #9c27b0)' }}
            >
              QUAY LẠI ĐĂNG NHẬP
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                {loading ? '...' : 'GỬI'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

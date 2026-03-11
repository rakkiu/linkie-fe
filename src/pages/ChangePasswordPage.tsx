import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ChangePasswordPage() {
  const { changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Mật khẩu mới phải khác mật khẩu cũ.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col">
      <div
        className="flex-shrink-0 h-[35vh]"
        style={{ background: 'linear-gradient(180deg, #00bcd4 0%, #6c3baa 60%, #1a1030 100%)' }}
      />

      <div className="flex-1 bg-[#0f1221] rounded-t-[2rem] -mt-8 px-6 pt-8 pb-6 flex flex-col">
        <h1 className="text-2xl font-black text-white tracking-wider mb-7">THAY ĐỔI MẬT KHẨU</h1>

        {success ? (
          <div className="flex flex-col gap-4">
            <p className="text-green-400 text-sm text-center bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3">
              Mật khẩu đã được thay đổi thành công!
            </p>
            <button
              onClick={() => navigate(-1)}
              className="w-full font-bold tracking-widest text-sm py-3 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #e91e8c, #9c27b0)' }}
            >
              QUAY LẠI
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="Mật khẩu hiện tại"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 outline-none focus:border-[#00bcd4] transition-colors"
            />
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

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 border border-[#00bcd4] text-white font-bold tracking-widest text-sm py-3 rounded-full hover:bg-[#00bcd4]/10 active:scale-[0.98] transition-all"
              >
                QUAY LẠI
              </button>
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

        {/* Divider + logout */}
        <div className="flex items-center gap-3 mt-8">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-gray-600 text-xs">hoặc</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
        <button
          onClick={handleLogout}
          className="mt-4 w-full border border-white/20 text-gray-400 font-bold tracking-widest text-sm py-3 rounded-full hover:bg-white/5 transition-all"
        >
          ĐĂNG XUẤT
        </button>
      </div>
    </div>
  );
}

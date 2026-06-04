import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoStar from '../image/logo-linkie-black.png';
import logoText from '../image/Linkie.png';

export default function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const effectRan = useRef(false);

  useEffect(() => {
    if (effectRan.current) return;
    effectRan.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Token xác thực không hợp lệ hoặc bị thiếu.');
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Email của bạn đã được xác thực thành công!');
      })
      .catch((err) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setStatus('error');
        setMessage(msg ?? 'Xác thực email thất bại. Token có thể đã hết hạn hoặc không hợp lệ.');
      });
  }, [searchParams, verifyEmail]);

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col">
      <div
        className="flex-shrink-0 h-[35vh]"
        style={{ background: 'linear-gradient(180deg, #00bcd4 0%, #6c3baa 60%, #1a1030 100%)' }}
      />

      <div className="flex-1 bg-[#0f1221] rounded-t-[2rem] -mt-8 px-6 pt-8 pb-6 flex flex-col items-center">
        <div className="flex flex-col items-center mb-8">
          <img src={logoStar} alt="Linkie Icon" className="h-16 w-auto mb-4 object-contain" />
          <img src={logoText} alt="Linkie" className="h-10 w-auto" />
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#e91e8c] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Đang xác thực email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <div className="bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-4 text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-green-400 text-sm font-semibold">Xác thực thành công!</p>
              <p className="text-gray-400 text-xs mt-1">{message}</p>
            </div>
            <Link
              to="/login"
              className="w-full text-center font-bold tracking-widest text-sm py-3 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #e91e8c, #9c27b0)' }}
            >
              ĐĂNG NHẬP NGAY
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-4 text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <p className="text-red-400 text-sm font-semibold">Xác thực thất bại</p>
              <p className="text-gray-400 text-xs mt-1">{message}</p>
            </div>
            <Link
              to="/login"
              className="w-full text-center font-bold tracking-widest text-sm py-3 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #e91e8c, #9c27b0)' }}
            >
              QUAY LẠI ĐĂNG NHẬP
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

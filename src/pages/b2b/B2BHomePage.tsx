import { useEffect, useState } from 'react';
import { pricingService } from '../../services/pricingService';

const FEATURES_LIST = [
  {
    icon: (
      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.598.598 0 0 1-.655-.077.598.598 0 0 1-.165-.63l1.24-3.679C4.945 15.334 4.125 13.75 4.125 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
    name: 'Wishwall LED',
    desc: 'Màn hình LED hiển thị lời chúc realtime tại không gian sự kiện'
  },
  {
    icon: (
      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
    name: 'AR Camera Frame',
    desc: 'Khung ảnh thực tế tăng cường độc quyền cho khách tham dự'
  },
  {
    icon: (
      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
      </svg>
    ),
    name: 'Photobooth Digital',
    desc: 'Chụp ảnh tự động lấy liền với khung hình thiết kế riêng'
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    name: 'Analytics Dashboard',
    desc: 'Thống kê chi tiết số lượt sử dụng, tương tác thời gian thực'
  },
  {
    icon: (
      <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12v12m.75-12h10.5a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25H8.25A2.25 2.25 0 0 1 6 15.75V8.25A2.25 2.25 0 0 1 8.25 6Z" />
      </svg>
    ),
    name: 'Ticket System',
    desc: 'Quản lý bán vé trực tuyến và quét mã xác thực tại cổng'
  },
  {
    icon: (
      <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.982-5.096A9.004 9.004 0 0021 12a9 9 0 10-9 9 8.96 8.96 0 006.813-3.096z" />
      </svg>
    ),
    name: 'AI Wishwall Filter',
    desc: 'Lọc tự động và phân tích xu hướng cảm xúc lời chúc bằng AI'
  }
];

const CheckIcon = () => (
  <svg className="w-5 h-5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const CrossIcon = () => (
  <svg className="w-5 h-5 text-zinc-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const PRICING_PLANS = [
  {
    id: 'students',
    name: 'Students',
    priceOriginal: '5 - 8 Tr',
    priceDiscounted: '3.5 - 5.6 Tr',
    discountBadge: 'Giảm 30%',
    period: '/sự kiện',
    tagline: 'Gói ưu đãi dành riêng cho sự kiện Học sinh - Sinh viên',
    attendees: '300 - 500 khách',
    features: [
      { text: 'Digital Wishwall (Wishwall kỹ thuật số)', active: true },
      { text: 'Khung ảnh độc quyền (tối đa 2 khung)', active: true },
      { text: 'Nhân vật độc quyền tích hợp (1 nhân vật)', active: true },
      { text: 'Báo cáo cơ bản sau sự kiện (Ảnh & Lời chúc)', active: true },
    ],
    buttonText: 'Bắt đầu ngay',
    buttonLink: 'mailto:linkie.project@gmail.com?subject=%C4%90%C4%83ng%20k%C3%BD%20g%C3%B3i%20Students%20-%20Linkie%20B2B',
  },
  {
    id: 'small',
    name: 'Small',
    priceOriginal: '11 - 13 Tr',
    priceDiscounted: '5.5 - 6.5 Tr',
    discountBadge: 'Giảm 50%',
    period: '/sự kiện',
    tagline: 'Phù hợp cho các sự kiện nhỏ của doanh nghiệp',
    attendees: 'Tối đa 1.000 khách',
    features: [
      { text: 'Digital Wishwall (Wishwall kỹ thuật số)', active: true },
      { text: 'Khung ảnh độc quyền (tối đa 5 khung)', active: true },
      { text: 'Nhân vật tích hợp (tối đa 2 nhân vật)', active: true },
      { text: 'Tùy biến chủ đề & Thương hiệu sự kiện', active: true },
      { text: 'Báo cáo cơ bản sau sự kiện (Truy cập, Ảnh, Lời chúc, Chia sẻ)', active: true },
    ],
    buttonText: 'Bắt đầu ngay',
    buttonLink: 'mailto:linkie.project@gmail.com?subject=%C4%90%C4%83ng%20k%C3%BD%20g%C3%B3i%20Small%20-%20Linkie%20B2B',
  },
  {
    id: 'medium',
    name: 'Medium',
    priceOriginal: '15 - 20 Tr',
    priceDiscounted: '15 - 20 Tr',
    discountBadge: null,
    badge: 'Phổ biến nhất',
    period: '/sự kiện',
    tagline: 'Giải pháp tối ưu và phổ biến cho sự kiện quy mô vừa',
    attendees: '1.000 - 3,000 khách',
    features: [
      { text: 'Khung ảnh độc quyền (tối đa 10 khung)', active: true },
      { text: 'Nhân vật tích hợp (tối đa 3 nhân vật)', active: true },
      { text: 'Tài khoản Admin quản lý toàn bộ tính năng', active: true },
      { text: 'Dashboard giám sát tương tác thời gian thực (Real-time)', active: true },
      { text: 'Fan Insight (Danh sách fan, dữ liệu tương tác)', active: true },
      { text: 'Báo cáo chi tiết (Traffic, CTR, Bản đồ nhiệt, Từ khóa)', active: true },
    ],
    buttonText: 'Chọn gói Medium',
    buttonLink: 'mailto:linkie.project@gmail.com?subject=%C4%90%C4%83ng%20k%C3%BD%20g%C3%B3i%20Medium%20-%20Linkie%20B2B',
  },
  {
    id: 'large',
    name: 'Large',
    priceOriginal: '20 - 28 Tr',
    priceDiscounted: '20 - 28 Tr',
    discountBadge: null,
    period: '/sự kiện',
    nameColor: 'bg-gradient-to-r from-[#00d4ff] to-[#9d50bb] bg-clip-text text-transparent',
    tagline: 'Giải pháp cao cấp nhất cho sự kiện quy mô lớn',
    attendees: '3,000 - 7,000 khách',
    features: [
      { text: 'Khung ảnh độc quyền (tối đa 20 khung)', active: true },
      { text: 'Nhân vật tích hợp (tối đa 4 nhân vật)', active: true },
      { text: 'Tài khoản Admin, Real-time Dashboard, Fan Insight', active: true },
      { text: 'Báo cáo nâng cao (Bản đồ nhiệt, Phân tích cảm xúc, Từ khóa)', active: true },
      { text: 'Hỗ trợ tích hợp Mini Games (Tăng tương tác và lan tỏa)', active: true },
    ],
    buttonText: 'Liên hệ tư vấn',
    buttonLink: 'mailto:linkie.project@gmail.com?subject=%C4%90%C4%83ng%20k%C3%BD%20g%C3%B3i%20Large%20-%20Linkie%20B2B',
  },
];

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
}

function PricingRegisterModal({ isOpen, onClose, planId }: ModalProps) {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [fanpage, setFanpage] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(planId);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const getPlanInfo = (planId: string) => {
    switch (planId.toLowerCase()) {
      case 'students':
        return { name: 'Students', desc: 'Gói Sinh viên - Học sinh', colorClass: 'from-[#10b981] to-[#059669]', textClass: 'text-emerald-400' };
      case 'small':
        return { name: 'Small', desc: 'Sự kiện Doanh nghiệp nhỏ', colorClass: 'from-[#3b82f6] to-[#2563eb]', textClass: 'text-blue-400' };
      case 'medium':
        return { name: 'Medium', desc: 'Sự kiện vừa - Khuyên dùng', colorClass: 'from-[#8b5cf6] to-[#7c3aed]', textClass: 'text-purple-400' };
      case 'large':
        return { name: 'Large', desc: 'Sự kiện lớn - Cao cấp', colorClass: 'from-[#ec4899] to-[#db2777]', textClass: 'text-pink-400' };
      default:
        return { name: 'Custom Solution', desc: 'Tư vấn giải pháp theo yêu cầu riêng', colorClass: 'from-[#06b6d4] to-[#0891b2]', textClass: 'text-cyan-400' };
    }
  };

  const planInfo = getPlanInfo(selectedPlan);

  useEffect(() => {
    setSelectedPlan(planId);
    setEmail('');
    setCompanyName('');
    setPhoneNumber('');
    setWebsite('');
    setFanpage('');
    setErrors({});
    setSubmitSuccess(false);
  }, [planId, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập Email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email không đúng định dạng';
    }
    if (!companyName.trim()) {
      newErrors.companyName = 'Vui lòng nhập Tên doanh nghiệp/Đơn vị';
    }
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Vui lòng nhập Số điện thoại';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const requestData = {
      email: email.trim(),
      companyName: companyName.trim(),
      phoneNumber: phoneNumber.trim(),
      website: website.trim() || undefined,
      fanpage: fanpage.trim() || undefined,
      planId: selectedPlan,
    };

    try {
      // 1. Cố gắng gửi lên Backend API thực tế
      await pricingService.createRequest(requestData);
    } catch (err) {
      console.warn('Gửi API Backend thất bại, chuyển sang chế độ fallback lưu trữ localStorage', err);
      
      // 2. Fallback ghi nhận vào localStorage nếu Backend gặp sự cố hoặc chưa kết nối
      const newFallbackRequest = {
        id: 'REQ-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        ...requestData,
        status: 'Pending' as const,
        createdAt: new Date().toISOString(),
      };

      const existing = localStorage.getItem('linkie_pricing_requests');
      let list = [];
      if (existing) {
        try {
          list = JSON.parse(existing);
        } catch (e) {
          list = [];
        }
      }
      list.push(newFallbackRequest);
      localStorage.setItem('linkie_pricing_requests', JSON.stringify(list));
    } finally {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-[#0c0c0e] border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden text-left">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white text-2xl font-light transition-colors leading-none"
        >
          &times;
        </button>

        {submitSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 animate-bounce">
              ✓
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Đăng ký thành công!</h3>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto">
              Cảm ơn bạn đã quan tâm. Đội ngũ Linkie sẽ liên hệ tư vấn lại cho bạn trong vòng 24 giờ tới.
            </p>
          </div>
        ) : (
          <div>
            <h3 className="text-2xl font-black text-white mb-1">Đăng ký tư vấn hợp tác</h3>
            <p className="text-zinc-400 text-xs mb-6">Vui lòng để lại thông tin để chúng tôi thiết kế giải pháp sự kiện phù hợp nhất.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Gói dịch vụ đã chọn</label>
                <div className="relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800/80 p-4 flex items-center justify-between shadow-[0_0_25px_rgba(168,85,247,0.04)]">
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${planInfo.colorClass} opacity-[0.08] blur-xl pointer-events-none`} />
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-0.5">Tên gói</span>
                    <span className={`text-lg font-black bg-gradient-to-r ${planInfo.colorClass} bg-clip-text text-transparent`}>
                      {planInfo.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-0.5">Loại hình sự kiện</span>
                    <span className="text-xs font-semibold text-zinc-300">
                      {planInfo.desc}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Tên doanh nghiệp / Đơn vị <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="Ví dụ: Công ty Cổ phần Linkie"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-zinc-900 border focus:outline-none rounded-xl text-sm text-white transition-colors ${
                    errors.companyName ? 'border-rose-500/50 focus:border-rose-500' : 'border-zinc-800 focus:border-purple-500/50'
                  }`}
                />
                {errors.companyName && <span className="text-rose-500 text-[10px] mt-1 block">{errors.companyName}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Số điện thoại <span className="text-rose-500">*</span></label>
                  <input
                    type="tel"
                    placeholder="Ví dụ: 0943414905"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`w-full px-4 py-2.5 bg-zinc-900 border focus:outline-none rounded-xl text-sm text-white transition-colors ${
                      errors.phoneNumber ? 'border-rose-500/50 focus:border-rose-500' : 'border-zinc-800 focus:border-purple-500/50'
                    }`}
                  />
                  {errors.phoneNumber && <span className="text-rose-500 text-[10px] mt-1 block">{errors.phoneNumber}</span>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Email liên hệ <span className="text-rose-500">*</span></label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 bg-zinc-900 border focus:outline-none rounded-xl text-sm text-white transition-colors ${
                      errors.email ? 'border-rose-500/50 focus:border-rose-500' : 'border-zinc-800 focus:border-purple-500/50'
                    }`}
                  />
                  {errors.email && <span className="text-rose-500 text-[10px] mt-1 block">{errors.email}</span>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Website (nếu có)</label>
                <input
                  type="url"
                  placeholder="https://company.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-purple-500/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Fanpage chính thức (nếu có)</label>
                <input
                  type="url"
                  placeholder="https://facebook.com/company"
                  value={fanpage}
                  onChange={(e) => setFanpage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-purple-500/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] active:scale-[0.99] flex items-center justify-center"
              >
                {isSubmitting ? 'Đang gửi...' : 'Xác nhận gửi thông tin'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-zinc-900 text-center text-xs text-zinc-500">
              <p className="mb-2">Hoặc liên hệ trực tiếp với chúng tôi qua:</p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-zinc-400 font-semibold">
                <a href="tel:0943414905" className="hover:text-cyan-400 transition-colors flex items-center gap-1">📞 0943 414 905</a>
                <span className="hidden sm:inline text-zinc-800">|</span>
                <a href="mailto:linkie.project@gmail.com" className="hover:text-purple-400 transition-colors flex items-center gap-1">📧 linkie.project@gmail.com</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function B2BHomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('medium');

  useEffect(() => {
    document.title = 'Linkie — Giải Pháp Sự Kiện Pricing';
  }, []);

  const openModal = (planId: string) => {
    setSelectedPlanId(planId);
    setIsModalOpen(true);
  };

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* ───────── NAV ───────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-gray-950/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
            Linkie
          </span>
          <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-white/10 rounded-full">Pricing</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={scrollToPricing}
            className="text-sm text-gray-300 hover:text-white transition-colors"
          >
            Bảng giá
          </button>
          <button
            onClick={() => openModal('custom')}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-semibold transition-colors"
          >
            Liên hệ ngay
          </button>
        </div>
      </nav>

      {/* ───────── HERO ───────── */}
      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/40 to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600/20 border border-violet-500/30 rounded-full text-violet-300 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            Nền tảng công nghệ sự kiện thế hệ mới
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
            Biến sự kiện thành
            <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              trải nghiệm đáng nhớ
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Linkie cung cấp hệ sinh thái công nghệ tương tác cho sự kiện doanh nghiệp —
            từ AR Camera, Photobooth, Wishwall LED đến Analytics realtime.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={scrollToPricing}
              className="px-8 py-4 bg-violet-600 hover:bg-violet-500 rounded-xl text-lg font-bold transition-all hover:scale-105 shadow-lg shadow-violet-500/30"
            >
              Xem bảng giá
            </button>
            <a
              href="tel:0943414905"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-lg font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <span>📞</span> 0943 414 905
            </a>
          </div>
        </div>
      </section>

      {/* ───────── VIDEO DEMO ───────── */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black font-display tracking-tight text-white mb-4">
            Trải Nghiệm Thực Tế
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto">
            Xem video giới thiệu TVC để hiểu rõ cách Linkie hoạt động và kết nối hàng ngàn khán giả tại sự kiện.
          </p>
        </div>
        <div className="relative rounded-3xl overflow-hidden bg-[#0c0c0e]/80 border border-zinc-800/40 p-2 backdrop-blur-sm shadow-[0_0_50px_rgba(168,85,247,0.08)] max-w-4xl mx-auto">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <video
            src="/tvc-linkie.mp4"
            controls
            playsInline
            className="w-full rounded-2xl border border-zinc-800/20 object-cover aspect-video shadow-2xl"
          />
        </div>
      </section>

      {/* ───────── FEATURES ───────── */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black font-display tracking-tight text-white mb-4">Tính năng nổi bật</h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto">
            Tất cả trong một nền tảng duy nhất — không cần cài đặt thêm phần mềm bổ sung.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES_LIST.map((f) => (
            <div
              key={f.name}
              className="group p-8 bg-[#0c0c0e]/80 border border-zinc-800/40 backdrop-blur-sm rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.06)]"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl mb-6 transition-all duration-300 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 group-hover:scale-105 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">{f.name}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── PRICING CTA BANNER ───────── */}
      <section className="py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            onClick={scrollToPricing}
            className="cursor-pointer group relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 hover:scale-[1.01]"
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div>
              <p className="text-violet-200 text-sm font-medium mb-1">Dành cho doanh nghiệp</p>
              <h2 className="text-2xl md:text-3xl font-black">Khám phá gói dịch vụ phù hợp</h2>
              <p className="text-violet-200 mt-1">Giá cả linh hoạt, tùy chỉnh theo quy mô sự kiện của bạn</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3 bg-white text-violet-700 px-6 py-3 rounded-xl font-bold text-lg shadow-lg group-hover:bg-violet-50 transition-colors">
              Xem bảng giá
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── PRICING SECTION ───────── */}
      <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black font-display tracking-tight text-white mb-4">
            Bảng Giá Minh Bạch
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Hạ tầng linh hoạt, tối ưu chi phí cho sự kiện ở mọi quy mô.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {PRICING_PLANS.map((plan) => {
            const isMedium = plan.id === 'medium';
            const hasDiscount = plan.discountBadge !== null;
            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-3xl p-6 transition-all duration-300 ${
                  isMedium
                    ? 'bg-[#0c0c0e]/95 border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.12)] relative md:-translate-y-2 md:scale-[1.02]'
                    : 'bg-[#0c0c0e]/80 border border-zinc-800/40 hover:border-zinc-700/60 shadow-xl backdrop-blur-sm'
                }`}
              >
                {isMedium && plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center bg-gradient-to-r from-[#00d4ff]/20 to-[#9d50bb]/20 border border-[#00d4ff]/30 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(0,212,255,0.25)] backdrop-blur-md whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <h3 className={`text-2xl font-black mb-6 ${plan.nameColor || 'text-white'}`}>
                    {plan.name}
                  </h3>
                  
                  <div className="mb-4">
                    {hasDiscount ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 text-xs line-through font-medium whitespace-nowrap">
                            {plan.priceOriginal}
                          </span>
                          <span className="inline-block bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20 text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                            {plan.discountBadge}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-[25px] sm:text-2xl lg:text-[23px] xl:text-[28px] font-black text-white tracking-tight whitespace-nowrap">
                            {plan.priceDiscounted}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium shrink-0">{plan.period}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-0.5 pt-6">
                        <span className="text-[25px] sm:text-2xl lg:text-[23px] xl:text-[28px] font-black text-white tracking-tight whitespace-nowrap">
                          {plan.priceOriginal}
                        </span>
                        {plan.period && (
                          <span className="text-[10px] text-zinc-400 font-medium shrink-0">{plan.period}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-zinc-400 text-xs leading-relaxed mb-6">
                    {plan.tagline}
                  </p>

                  <div className="flex items-center gap-2 mb-6 text-zinc-300 text-xs font-semibold bg-zinc-900/60 w-fit px-3 py-1.5 rounded-xl border border-zinc-800/40">
                    <span className="text-sm">👥</span>
                    <span>Quy mô: {plan.attendees}</span>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                        {f.active ? <CheckIcon /> : <CrossIcon />}
                        <span className={`text-sm leading-snug ${f.active ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => openModal(plan.id)}
                  className={`w-full block text-center py-3.5 px-6 rounded-full text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] ${
                    isMedium
                      ? 'bg-gradient-to-r from-[#00d4ff] to-[#9d50bb] hover:from-[#33ddff] hover:to-[#ae68c8] text-gray-950 font-black shadow-[0_0_20px_rgba(0,212,255,0.35)]'
                      : 'border border-zinc-800 hover:border-zinc-700 hover:bg-white/5 text-white'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            );
          })}
        </div>

        {/* ───────── CONTACT BLOCK ───────── */}
        <div className="mt-20 rounded-3xl bg-[#0c0c0e]/80 border border-zinc-800/40 backdrop-blur-md p-10 md:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

          <h3 className="text-2xl md:text-3xl font-black text-white mb-3">Cần tư vấn thêm?</h3>
          <p className="text-zinc-400 mb-10 max-w-md mx-auto text-sm leading-relaxed">
            Đội ngũ Linkie luôn sẵn sàng lắng nghe và thiết kế giải pháp công nghệ tối ưu nhất cho sự kiện của bạn.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-stretch max-w-2xl mx-auto">
            <a
              href="tel:0943414905"
              className="group flex items-center gap-4 px-6 py-4 bg-zinc-900/60 border border-zinc-800/60 hover:border-cyan-500/40 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] hover:bg-zinc-900/80 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] flex-1 justify-center sm:justify-start"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xl shrink-0 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/30 transition-all duration-300">
                📞
              </div>
              <div>
                <div className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Gọi ngay hotline</div>
                <div className="text-lg font-black text-white group-hover:text-cyan-300 transition-colors">0943 414 905</div>
              </div>
            </a>

            <a
              href="mailto:linkie.project@gmail.com?subject=Tu%20van%20giai%20phap%20su%20kien%20Pricing"
              className="group flex items-center gap-4 px-6 py-4 bg-zinc-900/60 border border-zinc-800/60 hover:border-purple-500/40 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] hover:bg-zinc-900/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] flex-1 justify-center sm:justify-start"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl shrink-0 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 transition-all duration-300">
                📧
              </div>
              <div>
                <div className="text-[11px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Gửi email cho chúng tôi</div>
                <div className="text-base font-black text-white group-hover:text-purple-300 transition-colors truncate max-w-[190px] sm:max-w-none">linkie.project@gmail.com</div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="border-t border-white/10 py-10 px-6 text-center text-gray-500 text-sm">
        <div className="mb-2 font-black text-xl bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
          Linkie
        </div>
        <p>© 2026 Linkie. Nền tảng công nghệ sự kiện thế hệ mới.</p>
        <div className="mt-3 flex justify-center gap-6">
          <a href="tel:0943414905" className="hover:text-violet-400 transition-colors">📞 0943 414 905</a>
          <a href="mailto:linkie.project@gmail.com" className="hover:text-violet-400 transition-colors">📧 linkie.project@gmail.com</a>
        </div>
      </footer>
      <PricingRegisterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} planId={selectedPlanId} />
    </div>
  );
}

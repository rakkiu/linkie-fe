import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { pricingService, type PricingRequestDto as PricingRequest } from '../../services/pricingService';

export default function AdminPricingRequestsPage() {
  const [requests, setRequests] = useState<PricingRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Tải dữ liệu từ Backend hoặc fallback localStorage
  const loadRequests = async () => {
    try {
      // 1. Gọi API thực tế
      const data = await pricingService.getAllRequests(filterStatus);
      setRequests(data);
    } catch (err) {
      console.warn('Lấy dữ liệu từ Backend thất bại, chuyển sang chế độ fallback đọc localStorage', err);
      // 2. Chế độ dự phòng localStorage
      const localData = localStorage.getItem('linkie_pricing_requests');
      if (localData) {
        try {
          const parsed = JSON.parse(localData) as PricingRequest[];
          parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setRequests(parsed);
        } catch (e) {
          console.error('Lỗi phân tích dữ liệu pricing requests từ localStorage', e);
        }
      } else {
        // Dữ liệu mẫu ban đầu
        const dummyRequests: PricingRequest[] = [
          {
            id: '1',
            email: 'contact@vinamilk.com.vn',
            companyName: 'Công ty Cổ phần Sữa Việt Nam (Vinamilk)',
            phoneNumber: '02854155555',
            website: 'https://www.vinamilk.com.vn',
            fanpage: 'https://facebook.com/vinamilk',
            planId: 'large',
            status: 'Pending',
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: '2',
            email: 'vng_hr@vng.com.vn',
            companyName: 'Công ty Cổ phần VNG',
            phoneNumber: '02839623888',
            website: 'https://vng.com.vn',
            planId: 'medium',
            status: 'Approved',
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          },
          {
            id: '3',
            email: 'cluba.hust@gmail.com',
            companyName: 'CLB Sinh viên Tình nguyện Bách Khoa HUST',
            phoneNumber: '0987654321',
            fanpage: 'https://facebook.com/cluba.hust',
            planId: 'students',
            status: 'Rejected',
            createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
          }
        ];
        localStorage.setItem('linkie_pricing_requests', JSON.stringify(dummyRequests));
        setRequests(dummyRequests);
      }
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  // Cập nhật trạng thái
  const updateStatus = async (id: string, newStatus: 'Approved' | 'Rejected') => {
    try {
      // 1. Gọi API thực tế
      await pricingService.updateStatus(id, newStatus);
      loadRequests();
    } catch (err) {
      console.warn('Cập nhật trạng thái qua API thất bại, fallback sang localStorage', err);
      // 2. Chế độ dự phòng localStorage
      const updated = requests.map(req => {
        if (req.id === id) {
          return { ...req, status: newStatus };
        }
        return req;
      });
      localStorage.setItem('linkie_pricing_requests', JSON.stringify(updated));
      setRequests(updated);
    }
  };

  // Xóa yêu cầu
  const deleteRequest = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa yêu cầu này?')) {
      try {
        // 1. Gọi API thực tế
        await pricingService.deleteRequest(id);
        loadRequests();
      } catch (err) {
        console.warn('Xóa yêu cầu qua API thất bại, fallback sang localStorage', err);
        // 2. Chế độ dự phòng localStorage
        const updated = requests.filter(req => req.id !== id);
        localStorage.setItem('linkie_pricing_requests', JSON.stringify(updated));
        setRequests(updated);
      }
    }
  };

  // Lọc dữ liệu
  const filteredRequests = requests.filter(req => {
    const matchesStatus = filterStatus === 'All' || req.status === filterStatus;
    const matchesSearch = 
      req.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.phoneNumber.includes(searchTerm) ||
      req.planId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getPlanBadgeClass = (planId: string) => {
    switch (planId.toLowerCase()) {
      case 'students':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'small':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'medium':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'large':
        return 'bg-pink-500/10 text-pink-400 border border-pink-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30';
      case 'Rejected':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Approved': return 'Đã duyệt';
      case 'Rejected': return 'Từ chối';
      default: return 'Chờ duyệt';
    }
  };

  const getPlanName = (planId: string) => {
    return planId.charAt(0).toUpperCase() + planId.slice(1);
  };

  return (
    <AdminLayout activePage="pricing-requests">
      <div className="p-6 md:p-8 min-h-screen text-white bg-[#0f1221]">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              🤝 YÊU CẦU HỢP TÁC <span className="text-xs font-semibold px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-full">PRICING</span>
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Quản lý và duyệt thông tin đăng ký hợp tác từ doanh nghiệp & đối tác sự kiện.
            </p>
          </div>
          <button
            onClick={loadRequests}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
          >
            🔄 Làm mới
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Tìm kiếm */}
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm theo tên DN, email, SĐT, gói..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0d1a] border border-zinc-800/80 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                ×
              </button>
            )}
          </div>

          {/* Lọc trạng thái */}
          <div className="flex gap-2 bg-[#0a0d1a] p-1 border border-zinc-800/80 rounded-xl max-w-fit">
            {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === status
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {status === 'All' ? 'Tất cả' : getStatusText(status)}
              </button>
            ))}
          </div>
        </div>

        {/* Table/List container */}
        <div className="bg-[#0a0d1a]/80 border border-zinc-800/40 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/40 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                  <th className="px-6 py-4">Doanh nghiệp / Đơn vị</th>
                  <th className="px-6 py-4">Gói dịch vụ</th>
                  <th className="px-6 py-4">Liên hệ (SĐT / Email)</th>
                  <th className="px-6 py-4">Liên kết (Web / Fanpage)</th>
                  <th className="px-6 py-4">Ngày đăng ký</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-sm text-zinc-300">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-zinc-950/20 transition-colors">
                      <td className="px-6 py-5">
                        <div className="font-bold text-white mb-1 leading-snug">{req.companyName}</div>
                        <div className="text-[11px] text-zinc-500">ID: {req.id}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${getPlanBadgeClass(req.planId)}`}>
                          {getPlanName(req.planId)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="font-medium text-white">📞 {req.phoneNumber}</span>
                          <span className="text-zinc-400">📧 {req.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2">
                          {req.website ? (
                            <a
                              href={req.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-cyan-400 hover:text-cyan-300 rounded text-xs transition-colors flex items-center gap-1 font-semibold"
                            >
                              🌐 Website
                            </a>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                          {req.fanpage ? (
                            <a
                              href={req.fanpage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-purple-500/40 text-purple-400 hover:text-purple-300 rounded text-xs transition-colors flex items-center gap-1 font-semibold"
                            >
                              👥 Fanpage
                            </a>
                          ) : (
                            !req.website && <span className="text-zinc-600">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-zinc-400 text-xs">
                        {new Date(req.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-black tracking-wide ${getStatusBadgeClass(req.status)}`}>
                          {getStatusText(req.status)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex gap-2 justify-end">
                          {req.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => updateStatus(req.id, 'Approved')}
                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-cyan-600/20"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={() => updateStatus(req.id, 'Rejected')}
                                className="px-3 py-1.5 bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600/30 text-rose-400 rounded-lg text-xs font-bold transition-colors"
                              >
                                Từ chối
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteRequest(req.id)}
                            className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors"
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 text-base">
                      Không tìm thấy yêu cầu hợp tác nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

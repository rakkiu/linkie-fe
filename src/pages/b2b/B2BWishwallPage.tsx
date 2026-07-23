import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import B2BLayout from './B2BLayout';

interface WishwallMessage {
  id: string;
  userName: string;
  message: string;
  sentiment: string;
  isHidden: boolean;
  isApproved: boolean;
  createdAt: string;
}

export default function B2BWishwallPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<WishwallMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    if (!user?.managedEventId) return;
    try {
      const res = await apiClient.get(`/b2b/events/${user.managedEventId}/wishwall/messages?page=1&pageSize=100`);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch Wishwall messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [user]);

  const handleApprove = async (messageId: string) => {
    try {
      await apiClient.patch(`/b2b/wishwall/${messageId}/approve`);
      fetchMessages();
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleReject = async (messageId: string) => {
    try {
      await apiClient.patch(`/b2b/wishwall/${messageId}/reject`);
      fetchMessages();
    } catch (err) {
      console.error('Reject failed:', err);
    }
  };

  return (
    <B2BLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Kiểm duyệt Wishwall</h2>
          <p className="text-gray-400">Xem và duyệt các lời chúc từ người tham gia sự kiện trước khi hiển thị lên màn hình LED.</p>
        </div>

        {/* Messages List */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Đang tải danh sách lời chúc...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Chưa có lời chúc nào được gửi.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {messages.map(msg => {
                const isPending = !msg.isApproved && !msg.isHidden;
                return (
                  <div key={msg.id} className={`p-6 flex flex-col md:flex-row gap-6 items-start md:items-center transition-colors ${isPending ? 'bg-orange-500/5' : ''}`}>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white">{msg.userName}</span>
                        <span className="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleString()}</span>
                        
                        {/* Sentiment Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                          ${msg.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
                            msg.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'}`}>
                          {msg.sentiment}
                        </span>

                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ml-auto
                          ${msg.isApproved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                            msg.isHidden ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                            'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                          {msg.isApproved ? 'Đã duyệt' : msg.isHidden ? 'Đã từ chối' : 'Chờ duyệt'}
                        </span>
                      </div>
                      <p className="text-gray-300 text-lg leading-relaxed">{msg.message}</p>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto shrink-0">
                      {!msg.isApproved && (
                        <button
                          onClick={() => handleApprove(msg.id)}
                          className="flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 transition-colors"
                        >
                          Duyệt
                        </button>
                      )}
                      {!msg.isHidden && (
                        <button
                          onClick={() => handleReject(msg.id)}
                          className="flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 transition-colors"
                        >
                          Từ chối
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </B2BLayout>
  );
}

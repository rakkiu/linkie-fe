import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import B2BLayout from './B2BLayout';

interface ArFrame {
  id: string;
  frameName: string;
  frameUrl: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

export default function B2BARFramesPage() {
  const { user } = useAuth();
  const [frames, setFrames] = useState<ArFrame[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [frameName, setFrameName] = useState('');

  const fetchFrames = async () => {
    if (!user?.managedEventId) return;
    try {
      const res = await apiClient.get(`/b2b/events/${user.managedEventId}/frames`);
      const allFrames = res.data.data || [];
      // Lọc bỏ những Frame dành cho Photobooth (có prefix [PB])
      setFrames(allFrames.filter((f: ArFrame) => !f.frameName.startsWith('[PB]')));
    } catch (err) {
      console.error('Failed to fetch AR frames:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrames();
  }, [user]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !frameName || !user?.managedEventId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('frameName', frameName);
    formData.append('file', selectedFile);

    try {
      await apiClient.post(`/b2b/events/${user.managedEventId}/frames`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSelectedFile(null);
      setFrameName('');
      fetchFrames();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Tải lên thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const handleToggle = async (frameId: string) => {
    try {
      await apiClient.patch(`/b2b/frames/${frameId}/toggle`);
      fetchFrames();
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const handleDelete = async (frameId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khung ảnh này?')) return;
    try {
      await apiClient.delete(`/b2b/frames/${frameId}`);
      fetchFrames();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <B2BLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Quản lý Camera AR</h2>
          <p className="text-gray-400">Tải lên và quản lý các khung ảnh (Frames) cho tính năng Camera AR tại sự kiện.</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4">Tải lên khung ảnh mới</h3>
          <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tên khung ảnh</label>
              <input
                type="text"
                value={frameName}
                onChange={e => setFrameName(e.target.value)}
                placeholder="VD: Khung Giáng Sinh 2026"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
                required
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">File ảnh (PNG trong suốt)</label>
              <input
                type="file"
                accept="image/png"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={uploading || !selectedFile || !frameName}
              className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 h-[46px] shrink-0"
            >
              {uploading ? 'Đang tải lên...' : 'Tải lên ngay'}
            </button>
          </form>
        </div>

        {/* Frames List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-400">Đang tải danh sách khung ảnh...</div>
          ) : frames.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white/5 border border-white/10 rounded-2xl border-dashed">
              <p className="text-gray-400">Chưa có khung ảnh nào. Hãy tải lên khung ảnh đầu tiên của sự kiện!</p>
            </div>
          ) : (
            frames.map(frame => (
              <div key={frame.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col group">
                <div className="aspect-[3/4] bg-black relative p-4 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
                  <img src={frame.frameUrl} alt={frame.frameName} className="relative z-10 max-h-full object-contain drop-shadow-2xl" />
                  
                  {/* Status badge */}
                  <div className="absolute top-3 right-3 z-20">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${frame.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                      {frame.isActive ? 'Đang bật' : 'Đã tắt'}
                    </span>
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-white font-bold truncate" title={frame.frameName}>{frame.frameName}</h4>
                    <p className="text-xs text-gray-400 mt-1">Sử dụng: {frame.usageCount} lần</p>
                  </div>
                  
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                    <button
                      onClick={() => handleToggle(frame.id)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${frame.isActive ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                    >
                      {frame.isActive ? 'Tắt' : 'Bật'}
                    </button>
                    <button
                      onClick={() => handleDelete(frame.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Xóa khung ảnh"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </B2BLayout>
  );
}

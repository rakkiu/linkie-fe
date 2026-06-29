import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import adminOrganizerService from '../../services/adminOrganizerService';
import type {
  OrganizerListItemDto,
  CreateOrganizerRequest,
  UpdateOrganizerRequest,
} from '../../services/adminOrganizerService';
import { adminEventService, type ApiEvent } from '../../services/adminEventService';

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ── OrganizerFormModal ────────────────────────────────────────────────────────
interface ModalProps {
  events: ApiEvent[];
  editing: OrganizerListItemDto | null;
  onClose: () => void;
  onSaved: () => void;
}

function OrganizerFormModal({ events, editing, onClose, onSaved }: ModalProps) {
  const isEdit = !!editing;

  const [username, setUsername] = useState(editing?.username ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(editing?.displayName ?? '');
  const [managedEventId, setManagedEventId] = useState(editing?.managedEventId ?? '');
  const [planTier, setPlanTier] = useState(editing?.planTier ?? 'Medium');

  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const handleUsernameBlur = async () => {
    if (!username.trim() || isEdit) return;
    // Optimistic check: will be caught on submit if it fails
    setUsernameError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    setUsernameError('');

    if (!managedEventId) {
      setGlobalError('Vui lòng chọn sự kiện được gán.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const updateData: UpdateOrganizerRequest = { displayName, managedEventId, planTier };
        await adminOrganizerService.update(editing!.id, updateData);
      } else {
        if (!password || password.length < 8) {
          setGlobalError('Mật khẩu phải có ít nhất 8 ký tự.');
          setSaving(false);
          return;
        }
        const createData: CreateOrganizerRequest = {
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
          displayName,
          managedEventId,
          planTier,
        };
        await adminOrganizerService.create(createData);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const errMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Đã xảy ra lỗi. Vui lòng thử lại.';
      if (errMsg.toLowerCase().includes('handle') || errMsg.toLowerCase().includes('username')) {
        setUsernameError(errMsg);
      } else {
        setGlobalError(errMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? '✏️ Sửa tài khoản Organizer' : '➕ Tạo tài khoản Organizer'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {globalError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              {globalError}
            </div>
          )}

          {/* Username — chỉ hiển thị khi tạo mới */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Handle <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center">
                <span className="bg-gray-800 border border-white/10 border-r-0 rounded-l-lg px-3 py-2.5 text-gray-400 text-sm">@</span>
                <input
                  id="org-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase())}
                  onBlur={handleUsernameBlur}
                  placeholder="vinfast_marketing"
                  required
                  className={`flex-1 bg-gray-800 border ${usernameError ? 'border-red-500' : 'border-white/10'} rounded-r-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500`}
                />
              </div>
              {usernameError && <p className="text-red-400 text-xs mt-1">{usernameError}</p>}
              <p className="text-gray-500 text-xs mt-1">Chỉ dùng chữ thường, số, gạch dưới. Không thể thay đổi sau khi tạo.</p>
            </div>
          )}

          {/* Email */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                id="org-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marketing@company.vn"
                required
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          )}

          {/* Password */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Mật khẩu <span className="text-red-400">*</span>
              </label>
              <input
                id="org-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                required
                minLength={8}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Tên hiển thị <span className="text-red-400">*</span>
            </label>
            <input
              id="org-displayname"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="VinFast Marketing Team"
              required
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Event Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Sự kiện được gán <span className="text-red-400">*</span>
            </label>
            <select
              id="org-event"
              value={managedEventId}
              onChange={(e) => setManagedEventId(e.target.value)}
              required
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
            >
              <option value="">— Chọn sự kiện —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          {/* Plan Tier Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Gói dịch vụ <span className="text-red-400">*</span>
            </label>
            <select
              id="org-plan"
              value={planTier}
              onChange={(e) => setPlanTier(e.target.value)}
              required
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
            >
              <option value="Students">Students (Basic)</option>
              <option value="Small">Small</option>
              <option value="Medium">Medium (Phổ biến)</option>
              <option value="Large">Large (VIP)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 border border-white/10 rounded-xl text-sm font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors"
            >
              {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminOrganizersPage() {
  const [organizers, setOrganizers] = useState<OrganizerListItemDto[]>([]);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrganizer, setEditingOrganizer] = useState<OrganizerListItemDto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [orgList, evList] = await Promise.all([
        adminOrganizerService.getAll(),
        adminEventService.getAllEvents(),
      ]);
      setOrganizers(orgList);
      setEvents(evList);
    } catch {
      showToast('Không thể tải dữ liệu. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingOrganizer(null);
    setShowModal(true);
  };

  const handleOpenEdit = (organizer: OrganizerListItemDto) => {
    setEditingOrganizer(organizer);
    setShowModal(true);
  };

  const handleDelete = async (organizer: OrganizerListItemDto) => {
    if (!window.confirm(`Bạn có chắc muốn XÓA VĨNH VIỄN tài khoản @${organizer.username}?`)) return;
    setDeletingId(organizer.id);
    try {
      await adminOrganizerService.delete(organizer.id);
      showToast(`Đã xóa tài khoản @${organizer.username}`);
      await loadData();
    } catch {
      showToast('Không thể xóa tài khoản. Vui lòng thử lại.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    showToast(editingOrganizer ? 'Cập nhật thành công!' : 'Tài khoản Organizer đã được tạo!');
    loadData();
  };

  return (
    <AdminLayout activePage="organizers">
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">Quản lý Organizer</h1>
            <p className="text-gray-400 text-sm mt-1">
              Tài khoản Organizer cho phép đối tác xem Dashboard của sự kiện được gán.
            </p>
          </div>
          <button
            id="btn-create-organizer"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-bold transition-all hover:scale-105"
          >
            <span className="text-lg">+</span> Tạo Organizer
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : organizers.length === 0 ? (
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-16 text-center">
            <div className="text-5xl mb-4">👤</div>
            <h3 className="text-xl font-bold mb-2">Chưa có tài khoản Organizer</h3>
            <p className="text-gray-400 mb-6">Nhấn "+ Tạo Organizer" để thêm tài khoản đầu tiên.</p>
            <button
              onClick={handleOpenCreate}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl font-bold transition-colors"
            >
              Tạo Organizer
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-6 py-4 text-gray-400 font-semibold">Handle</th>
                  <th className="px-6 py-4 text-gray-400 font-semibold">Email</th>
                  <th className="px-6 py-4 text-gray-400 font-semibold">Sự kiện</th>
                  <th className="px-6 py-4 text-gray-400 font-semibold">Gói</th>
                  <th className="px-6 py-4 text-gray-400 font-semibold">Kết thúc</th>
                  <th className="px-6 py-4 text-gray-400 font-semibold">Trạng thái</th>
                  <th className="px-6 py-4 text-gray-400 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {organizers.map((org) => (
                  <tr key={org.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-violet-300">@{org.username}</span>
                      <div className="text-gray-500 text-xs mt-0.5">{org.displayName}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{org.email}</td>
                    <td className="px-6 py-4 text-gray-300">{org.managedEventName ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 bg-violet-500/20 text-violet-300 rounded-lg text-xs font-bold border border-violet-500/30">
                        {org.planTier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{formatDate(org.eventEndTime)}</td>
                    <td className="px-6 py-4">
                      {org.isExpired ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          Hết hạn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Đang hoạt động
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          id={`btn-edit-${org.id}`}
                          onClick={() => handleOpenEdit(org)}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-white/10 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Sửa
                        </button>
                        <button
                          id={`btn-delete-${org.id}`}
                          onClick={() => handleDelete(org)}
                          disabled={deletingId === org.id}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {deletingId === org.id ? '...' : 'Xóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <OrganizerFormModal
          events={events}
          editing={editingOrganizer}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </AdminLayout>
  );
}

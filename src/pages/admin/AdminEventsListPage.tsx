import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from './AdminLayout';
import { adminEventService, type ApiEvent, type EventFormData, type ArFrame, mapStatusToString } from '../../services/adminEventService';
import { formatToLocalDateTime } from '../../lib/dateUtils';
import ImageCropperModal from '../../components/admin/ImageCropperModal';

function formatDateTime(iso: string) {
  return formatToLocalDateTime(iso);
}

export default function AdminEventsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EventFormData | null>(null);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editThumbnailPreview, setEditThumbnailPreview] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [frames, setFrames] = useState<ArFrame[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(false);
  const [newFrameName, setNewFrameName] = useState('');
  const [newFrameFile, setNewFrameFile] = useState<File | null>(null);
  const [newFramePreview, setNewFramePreview] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Image Cropper States
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Filter and Sort states
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('time-desc');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const labelStyle: React.CSSProperties = {
    display: 'block', color: '#aaa', fontSize: '12px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', padding: '12px 16px', color: 'white', outline: 'none', transition: 'all 0.2s',
    fontSize: '14px'
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminEventService.getAllEvents();
      setEvents(data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to load events. Make sure the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc muốn xóa sự kiện "${name}"?`)) return;
    setDeletingId(id);
    try {
      await adminEventService.deleteEvent(id);
      showToast('success', `Đã xóa sự kiện "${name}"`);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch {
      showToast('error', 'Xóa thất bại. Vui lòng thử lại.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRowClick = (event: ApiEvent) => {
    setEditingId(event.id);
    const formatForInput = (iso: string) => {
      if (!iso) return '';
      const d = new Date(iso);
      // Lấy ngày địa phương theo format YYYY-MM-DD
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    setEditFormData({
      name: event.name,
      description: event.description || '',
      startTime: formatForInput(event.startTime),
      endTime: formatForInput(event.endTime),
      location: event.location || '',
      maxParticipants: event.maxParticipants || 1000,
      isWishwallEnabled: event.isWishwallEnabled,
      status: mapStatusToString(event.status),
    });
    setEditThumbnailPreview(event.thumbnailUrl);
    setEditThumbnailFile(null);
    fetchFrames(event.id);
  };

  const fetchFrames = async (eventId: string) => {
    setLoadingFrames(true);
    try {
      const data = await adminEventService.getEventFrames(eventId);
      setFrames(data);
    } catch {
      // silently fail — loadingFrames state handled by finally
    } finally {
      setLoadingFrames(false);
    }
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditFormData(null);
    setEditThumbnailFile(null);
    setEditThumbnailPreview(null);
    setFrames([]);
    setNewFrameName('');
    setNewFrameFile(null);
    setNewFramePreview(null);
    setPreviewImage(null);
  };

  const handleAddFrame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !newFrameName || !newFrameFile) return;

    try {
      await adminEventService.uploadFrame(editingId, newFrameName, newFrameFile);
      showToast('success', 'Thêm khung hình thành công!');
      setNewFrameName('');
      setNewFrameFile(null);
      setNewFramePreview(null);
      fetchFrames(editingId);
    } catch (err) {
      showToast('error', 'Không thể thêm khung hình.');
    }
  };

  const handleToggleFrame = async (frameId: string) => {
    try {
      await adminEventService.toggleFrameStatus(frameId);
      if (editingId) fetchFrames(editingId);
    } catch (err) {
      showToast('error', 'Failed to toggle frame status.');
    }
  };

  const handleDeleteFrame = async (frameId: string, name: string) => {
    if (!window.confirm(`Permanently delete frame "${name}"?`)) return;
    try {
      await adminEventService.deleteFrame(frameId);
      if (editingId) fetchFrames(editingId);
    } catch (err) {
      showToast('error', 'Failed to delete frame.');
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setCropperImage(URL.createObjectURL(file));
      setShowCropper(true);
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    setEditThumbnailFile(croppedFile);
    setEditThumbnailPreview(URL.createObjectURL(croppedFile));
    setShowCropper(false);
    setCropperImage(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editFormData) return;
    
    setEditLoading(true);
    try {
      await adminEventService.updateEvent(editingId, editFormData, editThumbnailFile);
      showToast('success', 'Event updated successfully!');
      closeEditModal();
      fetchEvents();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        showToast('error', 'Session expired. Please log in again.');
      } else {
        showToast('error', 'Update failed. Please try again.');
      }
    } finally {
      setEditLoading(false);
    }
  };

  const cellStyle: React.CSSProperties = {
    padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#ddd', fontSize: '13px', verticalAlign: 'middle',
  };

  const headStyle: React.CSSProperties = {
    padding: '12px 16px', color: '#00e5ff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textAlign: 'left', borderBottom: '1px solid rgba(0, 229, 255, 0.15)', whiteSpace: 'nowrap',
  };

  const getFilteredAndSortedEvents = () => {
    let result = [...events];

    // Staff restriction: Only show Ongoing events
    if (isStaff) {
      result = result.filter(e => e.status === 'Ongoing');
    } else if (filterStatus !== 'All') {
      result = result.filter(e => e.status === filterStatus);
    }

    // Sort
    result.sort((a, b) => {
      // 1. Nếu đang xem "All Status" (hoặc role Staff), ưu tiên sắp xếp theo trạng thái: Upcoming (0) > Ongoing (1) > Finished (2)
      if (filterStatus === 'All' || isStaff) {
        const order: Record<string, number> = { 'Upcoming': 0, 'Ongoing': 1, 'Finished': 2 };
        const statusA = typeof a.status === 'string' ? a.status : mapStatusToString(a.status);
        const statusB = typeof b.status === 'string' ? b.status : mapStatusToString(b.status);
        
        if (order[statusA] !== order[statusB]) {
          return order[statusA] - order[statusB];
        }
      }

      // 2. Tiếp tục sắp xếp theo tiêu chí sortBy hiện tại
      let comparison = 0;
      switch (sortBy) {
        case 'time-asc':
          comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          break;
        case 'time-desc':
          comparison = new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
          break;
        case 'pax-asc':
          comparison = a.maxParticipants - b.maxParticipants;
          break;
        case 'pax-desc':
          comparison = b.maxParticipants - a.maxParticipants;
          break;
        default:
          comparison = 0;
      }

      // Secondary sort: Name A-Z if primary criteria is equal
      if (comparison === 0) {
        return a.name.localeCompare(b.name);
      }
      return comparison;
    });

    return result;
  };

  const filteredEvents = getFilteredAndSortedEvents();

  return (
    <AdminLayout activePage="events">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 20000,
          padding: '14px 22px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
          background: toast.type === 'success' ? 'linear-gradient(135deg,#00c853,#1b5e20)' : 'linear-gradient(135deg,#e53935,#7f0000)',
          color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 800, letterSpacing: '1px' }}>{isStaff ? 'ONGOING EVENTS' : 'EVENT MANAGEMENT'}</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Filter Status */}
          {!isStaff && (
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              style={{ ...inputStyle, width: 'auto', padding: '8px 16px', background: 'rgba(255,255,255,0.06)' }}
            >
              <option value="All">All Status</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Finished">Finished</option>
            </select>
          )}

          {/* Sort By */}
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={{ ...inputStyle, width: 'auto', padding: '8px 16px', background: 'rgba(255,255,255,0.06)' }}
          >
            <option value="time-desc">Time: Newest</option>
            <option value="time-asc">Time: Oldest</option>
            <option value="pax-desc">Pax: Highest</option>
            <option value="pax-asc">Pax: Lowest</option>
          </select>

          {!isStaff && (
            <button
              onClick={() => navigate('/admin/create-event')}
              style={{
                padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#e91e8c,#9c27b0)',
                color: 'white', fontWeight: 700, fontSize: '13px', letterSpacing: '1px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(233,30,140,0.3)',
              }}
            >
              + CREATE EVENT
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
          <div style={{ color: '#00e5ff' }}>Loading events...</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: '10px', padding: '24px', textAlign: 'center', color: '#ef9a9a' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
          <div>{error}</div>
          <button onClick={fetchEvents} style={{ marginTop: '16px', padding: '8px 24px', borderRadius: '6px', border: '1px solid rgba(229,57,53,0.5)', background: 'transparent', color: '#ef9a9a', cursor: 'pointer', fontSize: '13px' }}> Retry </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {filteredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#555', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <div style={{ fontSize: '16px', marginBottom: '8px', color: '#888' }}>{filterStatus === 'All' ? 'No events yet' : `No ${filterStatus} events found`}</div>
              <div style={{ fontSize: '13px', color: '#555' }}>Try changing your filters or create a new event</div>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <th style={headStyle}>THUMBNAIL</th>
                      <th style={headStyle}>EVENT NAME</th>
                      <th style={headStyle}>STATUS</th>
                      <th style={headStyle}>START TIME</th>
                      <th style={headStyle}>MAX PAX</th>
                      <th style={headStyle}>WISHWALL</th>
                      <th style={{ ...headStyle, textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map(event => (
                      <tr
                        key={event.id}
                        onClick={() => handleRowClick(event)}
                        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={cellStyle}>
                          <div style={{ width: '64px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                            {event.thumbnailUrl ? <img src={event.thumbnailUrl} alt={event.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '18px' }}>🖼️</div>}
                          </div>
                        </td>
                        <td style={{ ...cellStyle, color: 'white', fontWeight: 600 }}>{event.name}</td>
                        <td style={cellStyle}>
                          <span style={{ 
                            fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px',
                            background: 
                              event.status === 'Ongoing' ? 'rgba(0, 229, 255, 0.1)' : 
                              event.status === 'Upcoming' ? 'rgba(233, 30, 140, 0.1)' : 
                              'rgba(0, 230, 118, 0.1)',
                            color: 
                              event.status === 'Ongoing' ? '#00e5ff' : 
                              event.status === 'Upcoming' ? '#e91e8c' : 
                              '#00e676',
                            border: `1px solid ${
                              event.status === 'Ongoing' ? 'rgba(0, 229, 255, 0.3)' : 
                              event.status === 'Upcoming' ? 'rgba(233, 30, 140, 0.3)' : 
                              'rgba(0, 230, 118, 0.3)'
                            }`
                          }}>
                            {String(event.status || 'UPCOMING').toUpperCase()}
                          </span>
                        </td>
                        <td style={cellStyle}>{formatDateTime(event.startTime)}</td>
                        <td style={cellStyle}>{event.maxParticipants}</td>
                        <td style={cellStyle}>{event.isWishwallEnabled ? 'ON' : 'OFF'}</td>
                        <td style={{ ...cellStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            {!isStaff && (
                              <button
                                disabled={deletingId === event.id}
                                onClick={(e) => handleDelete(e, event.id, event.name)}
                                style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid rgba(229,57,53,0.5)', background: 'rgba(229,57,53,0.1)', color: '#ef9a9a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingId && editFormData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)', padding: '20px',
        }}>
          <div style={{
            background: '#0a0a0f', borderRadius: '24px', width: '100%', maxWidth: '1200px',
            maxHeight: '92vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)', color: 'white'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '24px 40px', borderBottom: '1px solid rgba(255,255,255,0.08)',
              position: 'sticky', top: 0, background: '#0a0a0f', zIndex: 10,
            }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '1px' }}>CHỈNH SỬA SỰ KIỆN</h2>
              <button onClick={closeEditModal} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '28px', cursor: 'pointer' }}> ✕ </button>
            </div>
            
            <div style={{ padding: '0 40px 40px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px 320px', gap: '24px', marginTop: '32px' }}>
                {/* 1st Column: Form Fields */}
                <form id="edit-event-form" onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>EVENT NAME</label>
                      <input required value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>STATUS</label>
                      <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} value={editFormData.status} onChange={e => setEditFormData({ ...editFormData, status: e.target.value as any })}>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Ongoing">Ongoing (Live)</option>
                        <option value="Finished">Finished</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>START DATE</label>
                      <input type="date" className="date-icon-white" required value={editFormData.startTime} onChange={e => setEditFormData({ ...editFormData, startTime: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>END DATE</label>
                      <input type="date" className="date-icon-white" required value={editFormData.endTime} onChange={e => setEditFormData({ ...editFormData, endTime: e.target.value })} style={inputStyle} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>LOCATION</label>
                    <input value={editFormData.location} onChange={e => setEditFormData({ ...editFormData, location: e.target.value })} style={inputStyle} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>MAX PAX</label>
                      <input type="number" min={1} value={editFormData.maxParticipants} onChange={e => setEditFormData({ ...editFormData, maxParticipants: Number(e.target.value) })} style={inputStyle} />
                    </div>
                    <div style={{ alignSelf: 'center', marginTop: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={editFormData.isWishwallEnabled} onChange={e => setEditFormData({ ...editFormData, isWishwallEnabled: e.target.checked })} style={{ accentColor: '#00e676', width: '18px', height: '18px' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>Enable Wishwall</span>
                      </label>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                    <button type="button" onClick={closeEditModal} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#999', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}> CANCEL </button>
                    <button type="submit" form="edit-event-form" disabled={editLoading} style={{ flex: 1.5, padding: '10px', borderRadius: '8px', border: 'none', background: editLoading ? '#333' : 'linear-gradient(135deg, #00e5ff, #00b0ff)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 16px rgba(0, 176, 255, 0.2)', fontSize: '13px' }}> {editLoading ? 'SAVING...' : 'SAVE CHANGES'} </button>
                  </div>
                </form>

                {/* 2nd Column: Thumbnail */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelStyle}>THUMBNAIL IMAGE</label>
                  <div onClick={() => fileInputRef.current?.click()} style={{ width: '100%', height: '240px', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                    {editThumbnailPreview ? <img src={editThumbnailPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', color: '#00e5ff' }}> <div style={{ fontSize: '32px' }}>🖼️</div> <div style={{ fontSize: '12px', fontWeight: 600 }}>Click to change thumbnail</div> </div>}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditFileChange} />
                  {editThumbnailFile && <div style={{ color: '#00e676', fontSize: '11px', marginTop: '8px', fontWeight: 600 }}>✓ {editThumbnailFile.name}</div>}
                </div>

                {/* Right Side: AR Frames Section */}
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '32px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '1px', color: '#00e5ff', marginBottom: '24px' }}> AR FRAMES MANAGEMENT </h3>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#00e5ff', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>ADD NEW FRAME</p>
                    
                    {newFramePreview && (
                      <div style={{ width: 'fit-content', minWidth: '100px', maxWidth: '100%', height: '140px', background: '#000', borderRadius: '8px', marginBottom: '12px', overflow: 'hidden', border: '1px solid rgba(0, 229, 255, 0.3)', cursor: 'pointer', margin: '0 auto', backgroundSize: '10px 10px', backgroundImage: 'linear-gradient(45deg, #161616 25%, transparent 25%), linear-gradient(-45deg, #161616 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #161616 75%), linear-gradient(-45deg, transparent 75%, #161616 75%)' }} onClick={() => setPreviewImage(newFramePreview)}>
                        <img src={newFramePreview} alt="New Frame Preview" style={{ height: '100%', objectFit: 'contain' }} />
                      </div>
                    )}

                    <input placeholder="Frame name..." value={newFrameName} onChange={e => setNewFrameName(e.target.value)} style={{ ...inputStyle, marginBottom: '10px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px' }} />
                    <div style={{ marginBottom: '12px' }}> 
                      <input 
                        type="file" 
                        accept=".png" 
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          setNewFrameFile(file);
                          if (file) {
                            setNewFramePreview(URL.createObjectURL(file));
                          } else {
                            setNewFramePreview(null);
                          }
                        }} 
                        style={{ fontSize: '11px', color: '#888' }} 
                      /> 
                    </div>
                    <button onClick={handleAddFrame} disabled={!newFrameName || !newFrameFile} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: (!newFrameName || !newFrameFile) ? '#333' : 'rgba(0, 229, 255, 0.15)', color: (!newFrameName || !newFrameFile) ? '#666' : '#00e5ff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(0, 229, 255, 0.2)' }}> UPLOAD FRAME </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#00e5ff', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>FRAMES ({frames.length})</p>
                    {loadingFrames && <div style={{ fontSize: '12px', color: '#00e5ff' }}>Loading frames...</div>}
                    {frames.map(frame => (
                      <div key={frame.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer', backgroundSize: '8px 8px', backgroundImage: 'linear-gradient(45deg, #161616 25%, transparent 25%), linear-gradient(-45deg, #161616 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #161616 75%), linear-gradient(-45deg, transparent 75%, #161616 75%)', backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.05)' }} onClick={() => setPreviewImage(frame.assetUrl)}>
                          <img src={frame.assetUrl} alt={frame.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => setPreviewImage(frame.assetUrl)}>{frame.name}</div>
                          <div style={{ fontSize: '11px', color: '#00e5ff', marginTop: '2px', fontWeight: 600 }}>AR Frame</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div onClick={() => handleToggleFrame(frame.id)} style={{ width: '50px', height: '24px', background: frame.isActive ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '20px', padding: '2px', cursor: 'pointer', position: 'relative', border: `1px solid ${frame.isActive ? '#00e676' : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.3s ease' }}>
                            <div style={{ position: 'absolute', left: frame.isActive ? '28px' : '2px', top: '2px', width: '18px', height: '18px', borderRadius: '50%', background: frame.isActive ? '#00e676' : '#666', transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)', boxShadow: frame.isActive ? '0 0 10px rgba(0,230,118,0.5)' : 'none' }} />
                            <span style={{ position: 'absolute', right: frame.isActive ? 'auto' : '6px', left: frame.isActive ? '6px' : 'auto', fontSize: '8px', fontWeight: 900, color: frame.isActive ? '#00e676' : '#666', lineHeight: '20px', textTransform: 'uppercase' }}> {frame.isActive ? 'ON' : 'OFF'} </span>
                          </div>
                          <button onClick={() => handleDeleteFrame(frame.id, frame.name)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#666' }}> 🗑️ </button>
                        </div>
                      </div>
                    ))}
                    {!loadingFrames && frames.length === 0 && <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>No frames yet. Upload a PNG frame above.</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: '40px', backdropFilter: 'blur(20px)' }}>
          <div style={{ position: 'relative', width: 'auto', maxHeight: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Checkerboard background for transparency visibility */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundSize: '20px 20px', backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)', backgroundColor: '#000', borderRadius: '12px', zIndex: -1 }}></div>
            <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', boxShadow: '0 0 80px rgba(0,0,0,0.8)', border: '2px solid rgba(255,255,255,0.15)', borderRadius: '12px' }} />
            <div style={{ position: 'absolute', bottom: '-40px', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>AR FRAME PREVIEW (TRANSPARENCY GUIDES ACTIVE)</div>
          </div>
          <div style={{ position: 'absolute', top: '30px', right: '40px', color: 'white', fontSize: '24px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'all 0.2s' }}>✕</div>
        </div>
      )}
      {showCropper && cropperImage && (
        <ImageCropperModal
          image={cropperImage}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setCropperImage(null);
          }}
        />
      )}
    </AdminLayout>
  );
}

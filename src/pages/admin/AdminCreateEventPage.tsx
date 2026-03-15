import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { adminEventService, type EventFormData } from '../../services/adminEventService';
import ImageCropperModal from '../../components/admin/ImageCropperModal';

export default function AdminCreateEventPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    maxParticipants: 1000,
    isWishwallEnabled: true,
    status: 'Upcoming',
  });

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stagedFrames, setStagedFrames] = useState<{ id: string; name: string; file: File; preview: string }[]>([]);
  const [newFrameName, setNewFrameName] = useState('');
  const [newFrameFile, setNewFrameFile] = useState<File | null>(null);
  const [newFramePreview, setNewFramePreview] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Image Cropper States
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: 'white',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#aaa',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '8px',
    letterSpacing: '0.5px',
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Lấy thời gian hiện tại chuẩn Local time để chặn chọn ngày trong quá khứ
  const getMinDateTime = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  const minDateTime = getMinDateTime();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setCropperImage(URL.createObjectURL(file));
      setShowCropper(true);
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    setThumbnailFile(croppedFile);
    setThumbnailPreview(URL.createObjectURL(croppedFile));
    setShowCropper(false);
    setCropperImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    try {
      const result = await adminEventService.createEvent(formData, thumbnailFile);
      const eventId = (result as any)?.id;
      
      if (eventId && stagedFrames.length > 0) {
        setToast({ type: 'success', message: `Đã tạo sự kiện. Đang tải lên ${stagedFrames.length} khung hình...` });
        for (const frame of stagedFrames) {
          await adminEventService.uploadFrame(eventId, frame.name, frame.file);
        }
      }
      
      showToast('success', 'Tạo sự kiện và khung hình thành công!');
      setTimeout(() => navigate('/admin/events'), 1500);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        showToast('error', 'Session expired. Please log in again.');
      } else {
        showToast('error', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddFrame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrameName || !newFrameFile) return;
    
    const newFrame = {
      id: Math.random().toString(36).substr(2, 9),
      name: newFrameName,
      file: newFrameFile,
      preview: URL.createObjectURL(newFrameFile)
    };
    
    setStagedFrames([...stagedFrames, newFrame]);
    setNewFrameName('');
    setNewFrameFile(null);
    setNewFramePreview(null);
  };

  const handleRemoveStagedFrame = (id: string) => {
    setStagedFrames(stagedFrames.filter(f => f.id !== id));
  };

  return (
    <AdminLayout activePage="create-event">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
          padding: '14px 22px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
          background: toast.type === 'success'
            ? 'linear-gradient(135deg,#00c853,#1b5e20)'
            : 'linear-gradient(135deg,#e53935,#7f0000)',
          color: 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          animation: 'fadeInDown 0.3s ease',
        }}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.message}
        </div>
      )}

      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
        <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 800, letterSpacing: '1px', marginBottom: '32px' }}>
          CREATE NEW EVENT
        </h1>

        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '40px' }}>
            {/* Left: Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>EVENT NAME</label>
                  <input required placeholder="e.g. Night Festival 2026" style={inputStyle} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>PUBLISH STATUS</label>
                  <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Finished">Finished</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>START DATE</label>
                  <input type="date" required style={inputStyle} className="date-icon-white" min={minDateTime.split('T')[0]} value={formData.startTime.split('T')[0]} onChange={e => setFormData({ ...formData, startTime: e.target.value + 'T00:00' })} />
                </div>
                <div>
                  <label style={labelStyle}>END DATE</label>
                  <input type="date" required style={inputStyle} className="date-icon-white" min={formData.startTime ? formData.startTime.split('T')[0] : minDateTime.split('T')[0]} value={formData.endTime.split('T')[0]} onChange={e => setFormData({ ...formData, endTime: e.target.value + 'T23:59' })} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>LOCATION</label>
                <input placeholder="e.g. My Dinh Stadium, Hanoi" style={inputStyle} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
              </div>

              <div>
                <label style={labelStyle}>DESCRIPTION</label>
                <textarea rows={4} placeholder="Brief description..." style={{ ...inputStyle, resize: 'none' }} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
            </div>

            {/* Right: Thumbnail */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>THUMBNAIL IMAGE</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', height: '310px', borderRadius: '12px',
                  border: '2px dashed rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', position: 'relative',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
              >
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#555' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🖼️</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#888' }}>CHỌN ẢNH THUMBNAIL</div>
                    <div style={{ fontSize: '11px', marginTop: '6px', color: '#444' }}>PNG, JPG, WEBP (16:9)</div>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              {thumbnailFile && <div style={{ color: '#00e676', fontSize: '12px', marginTop: '8px', fontWeight: 600 }}>✓ {thumbnailFile.name}</div>}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />

          {/* Max Participants + Wishwall */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            <div>
              <label style={labelStyle}>MAX PARTICIPANTS</label>
              <input
                type="number"
                min={1}
                style={{ ...inputStyle }}
                value={formData.maxParticipants}
                onChange={e => setFormData({ ...formData, maxParticipants: Number(e.target.value) })}
              />
            </div>

            <div>
              <label style={labelStyle}>WISHWALL ENABLED</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginTop: '12px' }}>
                <input
                  type="checkbox"
                  checked={formData.isWishwallEnabled}
                  onChange={(e) => setFormData({ ...formData, isWishwallEnabled: e.target.checked })}
                  style={{ accentColor: '#00e676', width: '20px', height: '20px' }}
                />
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>Allow fans to post wishes</span>
              </label>
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />

          {/* AR Frames Section */}
          <div>
            <h2 style={{ color: '#00e5ff', fontSize: '18px', fontWeight: 800, marginBottom: '24px', letterSpacing: '1px' }}>
              AR FRAMES MANAGEMENT
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '40px' }}>
              {/* Form Upload */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '12px' }}>
                <p style={labelStyle}>ADD FRAME (WILL CREATE WITH EVENT)</p>
                
                {newFramePreview && (
                  <div style={{ width: 'fit-content', minWidth: '100px', maxWidth: '100%', height: '160px', borderRadius: '10px', marginBottom: '16px', overflow: 'hidden', border: '1px solid rgba(0, 229, 255, 0.3)', cursor: 'pointer', margin: '0 auto', backgroundSize: '10px 10px', backgroundImage: 'linear-gradient(45deg, #161616 25%, transparent 25%), linear-gradient(-45deg, #161616 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #161616 75%), linear-gradient(-45deg, transparent 75%, #161616 75%)', backgroundColor: '#000' }} onClick={() => setPreviewImage(newFramePreview)}>
                    <img src={newFramePreview} alt="Queued Frame Preview" style={{ height: '100%', objectFit: 'contain' }} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input
                    placeholder="Frame name (e.g. New Year Frame)..."
                    style={inputStyle}
                    value={newFrameName}
                    onChange={e => setNewFrameName(e.target.value)}
                  />
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
                    style={{ fontSize: '13px', color: '#888' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddFrame}
                    disabled={!newFrameName || !newFrameFile}
                    style={{
                      padding: '12px', borderRadius: '8px',
                      background: (!newFrameName || !newFrameFile) ? '#333' : 'rgba(0, 229, 255, 0.15)',
                      color: (!newFrameName || !newFrameFile) ? '#666' : '#00e5ff', 
                      fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                      border: '1px solid rgba(0, 229, 255, 0.2)'
                    }}
                  >
                    ADD TO QUEUE
                  </button>
                </div>
              </div>

              {/* List */}
              <div>
                <p style={{ ...labelStyle, marginBottom: '16px' }}>QUEUED FRAMES ({stagedFrames.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {stagedFrames.map(frame => (
                    <div key={frame.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer', backgroundSize: '8px 8px', backgroundImage: 'linear-gradient(45deg, #161616 25%, transparent 25%), linear-gradient(-45deg, #161616 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #161616 75%), linear-gradient(-45deg, transparent 75%, #161616 75%)', backgroundColor: '#000' }} onClick={() => setPreviewImage(frame.preview)}>
                        <img 
                          src={frame.preview} 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        />
                      </div>
                      <div 
                        onClick={() => setPreviewImage(frame.preview)}
                        style={{ flex: 1, fontSize: '13px', fontWeight: 700, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white' }}
                      >
                        {frame.name}
                      </div>
                      <button type="button" onClick={() => handleRemoveStagedFrame(frame.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff5252' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                  {stagedFrames.length === 0 && <div style={{ fontSize: '12px', color: '#7ecfff', fontStyle: 'italic' }}>Click "Add to Queue" to stage frames before saving.</div>}
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '32px 0' }} />

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              style={{
                padding: '12px 32px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
                color: 'white', fontWeight: 700, fontSize: '14px', letterSpacing: '1px', cursor: 'pointer',
              }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 40px', borderRadius: '8px', border: 'none',
                background: loading ? '#555' : 'linear-gradient(135deg, #e91e8c, #9c27b0)',
                color: 'white', fontWeight: 800, fontSize: '14px', letterSpacing: '2px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(233,30,140,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'CREATING...' : 'CREATE EVENT'}
            </button>
          </div>
        </form>
      </div>

      {previewImage && (
        <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: '40px', backdropFilter: 'blur(20px)' }}>
          <div style={{ position: 'relative', width: 'auto', maxHeight: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Checkerboard background for transparency visibility */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundSize: '16px 16px', backgroundImage: 'linear-gradient(45deg, #161616 25%, transparent 25%), linear-gradient(-45deg, #161616 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #161616 75%), linear-gradient(-45deg, transparent 75%, #161616 75%)', backgroundColor: '#000', borderRadius: '12px', zIndex: -1 }}></div>
            <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', boxShadow: '0 0 80px rgba(0,0,0,0.8)', border: '2px solid rgba(255,255,255,0.15)', borderRadius: '12px' }} />
            <div style={{ position: 'absolute', bottom: '-40px', color: 'rgba(0,229,255,0.5)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px' }}>AR FRAME PREVIEW MODE</div>
          </div>
          <div style={{ position: 'absolute', top: '30px', right: '40px', color: 'white', fontSize: '24px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>✕</div>
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

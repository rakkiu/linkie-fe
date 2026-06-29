import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout'
import { adminEventService, type ApiEvent } from '../../services/adminEventService'
import { ticketService, type ImportTicketsResponse } from '../../services/ticketService'

export default function TicketImportPage() {
  const [events, setEvents] = useState<ApiEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportTicketsResponse | null>(null)
  const [fetchingEvents, setFetchingEvents] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await adminEventService.getAllEvents()
        setEvents(data)
        if (data.length > 0) setSelectedEventId(data[0].id)
      } catch {
        showToast('error', 'Không thể tải danh sách sự kiện.')
      } finally {
        setFetchingEvents(false)
      }
    }
    loadEvents()
  }, [])

  const handleUpload = async () => {
    if (!file || !selectedEventId) return

    setLoading(true)
    setResult(null)

    try {
      const res = await ticketService.importTickets(selectedEventId, file)
      setResult(res)
      showToast('success', `Import hoàn tất: ${res.importedTickets}/${res.totalRecords} vé thành công.`)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 400) {
        showToast('error', 'File không hợp lệ. Vui lòng kiểm tra định dạng.')
      } else {
        showToast('error', 'Import thất bại. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', color: '#aaa', fontSize: '12px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', padding: '12px 16px', color: 'white', outline: 'none', fontSize: '14px',
  }

  return (
    <AdminLayout activePage="tickets">
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 20000,
          padding: '14px 22px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
          background: toast.type === 'success'
            ? 'linear-gradient(135deg,#00c853,#1b5e20)'
            : 'linear-gradient(135deg,#e53935,#7f0000)',
          color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.message}
        </div>
      )}

      <div style={{ maxWidth: '720px' }}>
        <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 800, letterSpacing: '1px', marginBottom: '28px' }}>
          IMPORT VÉ TỪ FILE EXCEL
        </h1>

        {fetchingEvents ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
            <div style={{ color: '#00e5ff' }}>Đang tải sự kiện...</div>
          </div>
        ) : (
          <>
            {/* Event Selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>CHỌN SỰ KIỆN</label>
              <select
                value={selectedEventId}
                onChange={e => { setSelectedEventId(e.target.value); setResult(null) }}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">-- Chọn sự kiện --</option>
                {events.map(e => (
                  <option key={e.id} value={e.id} style={{ background: '#0a0a0f' }}>{e.name}</option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>FILE EXCEL</label>
              <div
                style={{
                  border: `2px dashed ${file ? '#00e676' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: '12px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: file ? 'rgba(0,230,118,0.03)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s',
                }}
                onClick={() => document.getElementById('file-input')?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const droppedFile = e.dataTransfer.files[0]
                  if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
                    setFile(droppedFile)
                    setResult(null)
                  } else {
                    showToast('error', 'Vui lòng chọn file .xlsx hoặc .xls')
                  }
                }}
              >
                {file ? (
                  <div>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>📄</div>
                    <div style={{ color: '#00e676', fontWeight: 700, fontSize: '15px' }}>{file.name}</div>
                    <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>📂</div>
                    <div style={{ color: '#aaa', fontWeight: 600, fontSize: '14px' }}>
                      Kéo thả file Excel vào đây hoặc nhấn để chọn
                    </div>
                    <div style={{ color: '#555', fontSize: '12px', marginTop: '6px' }}>
                      Định dạng: .xlsx, .xls
                    </div>
                  </div>
                )}
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0] || null
                    if (f) {
                      setFile(f)
                      setResult(null)
                    }
                  }}
                />
              </div>
              <div style={{ marginTop: '8px', color: '#555', fontSize: '11px', display: 'flex', gap: '16px' }}>
                <span>Cột: TicketCode | Email | Status (ACTIVE/EXPIRED/CANCELLED)</span>
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || !selectedEventId || loading}
              style={{
                width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                background: (!file || !selectedEventId || loading)
                  ? '#333'
                  : 'linear-gradient(135deg, #e91e8c, #9c27b0)',
                color: (!file || !selectedEventId || loading) ? '#666' : 'white',
                fontWeight: 800, fontSize: '15px', letterSpacing: '1px',
                cursor: (!file || !selectedEventId || loading) ? 'not-allowed' : 'pointer',
                boxShadow: (!file || !selectedEventId || loading)
                  ? 'none'
                  : '0 4px 12px rgba(233,30,140,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'ĐANG IMPORT...' : 'IMPORT VÉ'}
            </button>

            {/* Result */}
            {result && (
              <div style={{
                marginTop: '28px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '24px',
              }}>
                <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 800, marginBottom: '16px', letterSpacing: '1px' }}>
                  KẾT QUẢ IMPORT
                </h2>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ flex: 1, background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.25)', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ color: '#00e676', fontSize: '28px', fontWeight: 800 }}>{result.importedTickets}</div>
                    <div style={{ color: '#00e676', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>THÀNH CÔNG</div>
                  </div>
                  <div style={{ flex: 1, background: result.failedRecords.length > 0 ? 'rgba(229,57,53,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${result.failedRecords.length > 0 ? 'rgba(229,57,53,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ color: result.failedRecords.length > 0 ? '#ef5350' : '#888', fontSize: '28px', fontWeight: 800 }}>{result.failedRecords.length}</div>
                    <div style={{ color: result.failedRecords.length > 0 ? '#ef5350' : '#888', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>LỖI</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ color: 'white', fontSize: '28px', fontWeight: 800 }}>{result.totalRecords}</div>
                    <div style={{ color: '#888', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>TỔNG</div>
                  </div>
                </div>

                {result.failedRecords.length > 0 && (
                  <div>
                    <h3 style={{ color: '#ef5350', fontSize: '13px', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.5px' }}>
                      CHI TIẾT LỖI ({result.failedRecords.length})
                    </h3>
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(229,57,53,0.1)' }}>
                            <th style={{ padding: '10px 14px', color: '#ef5350', fontSize: '11px', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid rgba(229,57,53,0.2)' }}>DÒNG</th>
                            <th style={{ padding: '10px 14px', color: '#ef5350', fontSize: '11px', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid rgba(229,57,53,0.2)' }}>EMAIL</th>
                            <th style={{ padding: '10px 14px', color: '#ef5350', fontSize: '11px', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid rgba(229,57,53,0.2)' }}>LÝ DO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.failedRecords.map((failed, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '10px 14px', color: '#ddd', fontSize: '13px' }}>{failed.rowNumber}</td>
                              <td style={{ padding: '10px 14px', color: '#ddd', fontSize: '13px' }}>{failed.email}</td>
                              <td style={{ padding: '10px 14px', color: '#ef9a9a', fontSize: '13px' }}>{failed.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ color: '#555', fontSize: '11px', marginTop: '16px' }}>
                  Import lúc: {new Date(result.importedAt).toLocaleString('vi-VN')}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}

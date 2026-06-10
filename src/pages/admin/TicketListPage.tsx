import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { adminEventService, type ApiEvent } from '../../services/adminEventService'
import { ticketService, type TicketDetail } from '../../services/ticketService'

export default function TicketListPage() {
  const navigate = useNavigate()

  const [events, setEvents] = useState<ApiEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [tickets, setTickets] = useState<TicketDetail[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
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
        if (data.length > 0) {
          setSelectedEventId(data[0].id)
        }
      } catch {
        showToast('error', 'Không thể tải danh sách sự kiện.')
      } finally {
        setFetchingEvents(false)
      }
    }
    loadEvents()
  }, [])

  const fetchTickets = useCallback(async (eventId: string, p: number, status: string) => {
    if (!eventId) return
    setLoading(true)
    try {
      const res = await ticketService.getEventTickets(
        eventId,
        p,
        pageSize,
        status || undefined
      )
      setTickets(res.tickets)
      setTotalRecords(res.totalRecords)
    } catch {
      showToast('error', 'Không thể tải danh sách vé.')
      setTickets([])
      setTotalRecords(0)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    if (!selectedEventId) return
    setPage(1)
    fetchTickets(selectedEventId, 1, statusFilter)
  }, [selectedEventId, statusFilter, fetchTickets])

  useEffect(() => {
    if (!selectedEventId) return
    fetchTickets(selectedEventId, page, statusFilter)
  }, [page, selectedEventId, statusFilter, fetchTickets])

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))

  const statusBadgeStyle = (status: string): React.CSSProperties => ({
    fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px',
    background:
      status === 'ACTIVE' ? 'rgba(0, 230, 118, 0.1)' :
      status === 'EXPIRED' ? 'rgba(255, 152, 0, 0.1)' :
      'rgba(229, 57, 53, 0.1)',
    color:
      status === 'ACTIVE' ? '#00e676' :
      status === 'EXPIRED' ? '#ff9800' :
      '#ef5350',
    border: `1px solid ${
      status === 'ACTIVE' ? 'rgba(0, 230, 118, 0.3)' :
      status === 'EXPIRED' ? 'rgba(255, 152, 0, 0.3)' :
      'rgba(229, 57, 53, 0.3)'
    }`,
  })

  const cellStyle: React.CSSProperties = {
    padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#ddd', fontSize: '13px', verticalAlign: 'middle',
  }

  const headStyle: React.CSSProperties = {
    padding: '12px 14px', color: '#00e5ff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textAlign: 'left', borderBottom: '1px solid rgba(0, 229, 255, 0.15)',
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', padding: '10px 16px', color: 'white', outline: 'none', fontSize: '14px',
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

      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 800, letterSpacing: '1px' }}>
            QUẢN LÝ VÉ
          </h1>
          <button
            onClick={() => navigate('/admin/tickets/import')}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg,#e91e8c,#9c27b0)',
              color: 'white', fontWeight: 700, fontSize: '13px', letterSpacing: '1px',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(233,30,140,0.3)',
            }}
          >
            + IMPORT VÉ
          </button>
        </div>

        {/* Filters */}
        {fetchingEvents ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
            <div style={{ color: '#00e5ff' }}>Đang tải sự kiện...</div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
              >
                <option value="">-- Chọn sự kiện --</option>
                {events.map(e => (
                  <option key={e.id} value={e.id} style={{ background: '#0a0a0f' }}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', minWidth: '140px' }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        {!selectedEventId && !fetchingEvents && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#555', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎫</div>
            <div style={{ fontSize: '16px', color: '#888' }}>Vui lòng chọn sự kiện để xem danh sách vé</div>
          </div>
        )}

        {selectedEventId && loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
            <div style={{ color: '#00e5ff' }}>Đang tải danh sách vé...</div>
          </div>
        )}

        {selectedEventId && !loading && (
          <>
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', overflow: 'hidden',
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <th style={headStyle}>MÃ VÉ</th>
                      <th style={headStyle}>EMAIL</th>
                      <th style={headStyle}>NGƯỜI DÙNG</th>
                      <th style={headStyle}>TRẠNG THÁI</th>
                      <th style={headStyle}>GÁN LÚC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎫</div>
                          <div>Chưa có vé nào cho sự kiện này.</div>
                        </td>
                      </tr>
                    ) : (
                      tickets.map(ticket => (
                        <tr
                          key={ticket.ticketId}
                          style={{ transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ ...cellStyle, color: 'white', fontWeight: 600 }}>{ticket.ticketCode}</td>
                          <td style={cellStyle}>{ticket.email}</td>
                          <td style={cellStyle}>{ticket.userName || '—'}</td>
                          <td style={cellStyle}>
                            <span style={statusBadgeStyle(ticket.status)}>
                              {ticket.status}
                            </span>
                          </td>
                          <td style={cellStyle}>
                            {ticket.assignedAt
                              ? new Date(ticket.assignedAt).toLocaleString('vi-VN')
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: '20px', color: '#888', fontSize: '13px',
              }}>
                <span>Tổng: {totalRecords} vé</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                      background: 'transparent', color: page <= 1 ? '#444' : 'white', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600,
                    }}
                  >
                    Trước
                  </button>
                  <span style={{ color: '#aaa' }}>
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                      background: 'transparent', color: page >= totalPages ? '#444' : 'white', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600,
                    }}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}

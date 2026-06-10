import { apiClient } from './apiClient'

// ── Types ────────────────────────────────────────────────────────────────────

export interface TicketCheckResult {
  hasValidTicket: boolean
  ticketCode?: string
  ticketStatus?: string
  message?: string
}

export interface ImportTicketsResponse {
  success: boolean
  eventId: string
  totalRecords: number
  importedTickets: number
  failedRecords: FailedRecord[]
  importedAt: string
}

export interface FailedRecord {
  rowNumber: number
  email: string
  reason: string
}

export interface TicketDetail {
  ticketId: string
  ticketCode: string
  email: string
  userId?: string
  userName?: string
  status: string
  assignedAt?: string
}

export interface GetEventTicketsResponse {
  eventId: string
  totalRecords: number
  tickets: TicketDetail[]
}

// ── Service ───────────────────────────────────────────────────────────────────

export const ticketService = {
  /** GET — Check if the current user has a valid ticket for an event */
  checkUserTicket: async (eventId: string): Promise<TicketCheckResult> => {
    const response = await apiClient.get(`/events/${eventId}/user/has-ticket`)
    return response.data.data ?? response.data
  },

  /** POST — Admin imports tickets from Excel file */
  importTickets: async (
    eventId: string,
    file: File
  ): Promise<ImportTicketsResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(
      `/admin/events/${eventId}/tickets/import`,
      formData
    )
    return response.data.data ?? response.data
  },

  /** GET — Admin lists tickets for an event with pagination */
  getEventTickets: async (
    eventId: string,
    page: number = 1,
    pageSize: number = 20,
    status?: string
  ): Promise<GetEventTicketsResponse> => {
    const params: Record<string, string | number> = { page, pageSize }
    if (status) params.status = status
    const response = await apiClient.get(`/admin/events/${eventId}/tickets`, { params })
    return response.data.data ?? response.data
  },
}

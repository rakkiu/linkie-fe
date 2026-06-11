import { useEffect, useState, useRef, useCallback } from 'react'
import { ticketService, type TicketCheckResult } from '../services/ticketService'

interface UseTicketVerificationReturn {
  ticketStatus: TicketCheckResult | null
  loading: boolean
  refetch: () => void
}

export const useTicketVerification = (
  eventId: string | undefined
): UseTicketVerificationReturn => {
  const [ticketStatus, setTicketStatus] = useState<TicketCheckResult | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  const checkTicket = useCallback(async () => {
    if (!eventId) {
      setLoading(false)
      return
    }

    try {
      const result = await ticketService.checkUserTicket(eventId)
      setTicketStatus(result)
    } catch {
      setTicketStatus({
        hasValidTicket: false,
        requiresTicket: true,
        message: 'Không thể kiểm tra vé. Vui lòng thử lại sau.',
      })
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }

    if (fetchedRef.current) return
    fetchedRef.current = true

    checkTicket()
  }, [eventId, checkTicket])

  return { ticketStatus, loading, refetch: checkTicket }
}

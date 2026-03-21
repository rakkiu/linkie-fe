import { apiClient, BASE_URL, ACCESS_TOKEN_KEY } from './apiClient';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PublicEvent {
  id: string;
  name: string;
  description: string;
  startTime: string;   // ISO 8601
  endTime: string;     // ISO 8601
  location: string;
  maxParticipants: number;
  isWishwallEnabled: boolean;
  thumbnailUrl: string | null;
  status: 'Draft' | 'Active' | 'Completed' | 'Cancelled';
}

export interface ArFrame {
  id: string;
  name: string;
  assetUrl: string;
  isActive: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Ensures a URL is absolute for images/assets. */
export const ensureImageUrl = (url: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  const baseUrl = 'http://localhost:5002';
  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
};

/** Tính trạng thái sự kiện dựa trên thời gian hiện tại */
export const getEventStatus = (event: PublicEvent): 'live' | 'upcoming' | 'past' => {
  const now = Date.now();
  const start = new Date(event.startTime).getTime();
  const end = new Date(event.endTime).getTime();
  if (now >= start && now <= end) return 'live';
  if (now < start) return 'upcoming';
  return 'past';
};

// ── Service ───────────────────────────────────────────────────────────────────

export const eventService = {

  /** GET — Lấy danh sách sự kiện (public, không cần auth) */
  getAllEvents: async (status?: string): Promise<PublicEvent[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/events', { params });
    const data = response.data.data ?? response.data;
    return data.map((event: any) => ({
      ...event,
      thumbnailUrl: ensureImageUrl(event.thumbnailUrl)
    }));
  },

  /** GET — Lấy chi tiết một sự kiện theo ID (có fallback nếu 404) */
  getEventById: async (id: string): Promise<PublicEvent> => {
    try {
      const response = await apiClient.get(`/events/${id}`);
      const event = response.data.data ?? response.data;
      return {
        ...event,
        thumbnailUrl: ensureImageUrl(event.thumbnailUrl)
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`Event ${id} not found by direct ID, trying fallback from all events...`);
        const allEvents = await eventService.getAllEvents();
        const found = allEvents.find(e => e.id === id);
        if (found) return found;
      }
      throw error;
    }
  },

  /** GET — Lấy danh sách Frame của một sự kiện (chỉ lấy frame active) */
  getEventFrames: async (eventId: string): Promise<ArFrame[]> => {
    const response = await apiClient.get(`/events/${eventId}/frames`);
    const data = response.data.data ?? response.data;
    return data.map((f: any) => ({
      id: f.id,
      name: f.frameName || f.name,
      assetUrl: f.frameUrl || f.assetUrl,
      isActive: f.isActive
    }));
  },

  /** POST — Ghi nhận lượt sử dụng Frame (chụp ảnh) - Dùng fetch để tránh axios 401 interceptor gây logout */
  recordFrameUsage: async (eventId: string, frameId: string): Promise<void> => {
    try {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      await fetch(`${BASE_URL}/events/${eventId}/frames/${frameId}/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({})
      });
    } catch (error) {
      console.error('Failed to record frame usage (silent):', error);
    }
  },
};

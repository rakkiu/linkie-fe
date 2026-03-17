import { apiClient } from './apiClient';

// ── Types ────────────────────────────────────────────────────────────────────

export type EventStatus = 'Upcoming' | 'Ongoing' | 'Finished';

export interface ApiEvent {
  id: string;
  name: string;
  description: string;
  startTime: string;   // ISO 8601
  endTime: string;     // ISO 8601
  location: string;
  maxParticipants: number;
  isWishwallEnabled: boolean;
  thumbnailUrl: string | null;
  status: EventStatus | number;
}

export interface EventFormData {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  maxParticipants: number | string;
  isWishwallEnabled: boolean;
  status?: EventStatus;
}

export interface ArFrame {
  id: string;
  name: string;
  assetUrl: string;
  isActive: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Ensures a datetime string includes the Vietnam timezone offset (+07:00).
 * Handles output from <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
 */
const ensureVietnamTimezone = (dateStr: string, isEnd: boolean = false): string => {
  if (!dateStr) return dateStr;
  // If timezone offset already present (Z, + or -), return as-is
  if (dateStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // If only YYYY-MM-DD (length 10)
  if (dateStr.length === 10) {
    const time = isEnd ? '23:59:59' : '00:00:00';
    return `${dateStr}T${time}+07:00`;
  }
  
  // If YYYY-MM-DDTHH:mm
  return `${dateStr}:00+07:00`;
};

export const mapStatusToString = (status: any): EventStatus => {
  const map: Record<number | string, EventStatus> = {
    0: 'Upcoming',
    1: 'Ongoing',
    2: 'Finished',
    'Upcoming': 'Upcoming',
    'Ongoing': 'Ongoing',
    'Finished': 'Finished'
  };
  return map[status] ?? 'Upcoming';
};

/**
 * Ensures a URL is absolute for images/assets.
 */
export const ensureImageUrl = (url: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  // If it's a relative path (e.g. /uploads/...), prepend server URL
  const baseUrl = 'http://localhost:5002';
  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
};

const buildFormData = (eventData: EventFormData, thumbnailFile?: File | null): FormData => {
  const formData = new FormData();
  formData.append('Name', eventData.name);
  formData.append('Description', eventData.description || '');
  formData.append('StartTime', ensureVietnamTimezone(eventData.startTime));
  formData.append('EndTime', ensureVietnamTimezone(eventData.endTime, true));
  formData.append('Location', eventData.location || '');
  formData.append('MaxParticipants', String(eventData.maxParticipants));
  formData.append('IsWishwallEnabled', String(eventData.isWishwallEnabled));
  if (eventData.status) {
    formData.append('Status', eventData.status);
  }
  if (thumbnailFile) {
    // API expects "Thumbnail" case sensitive
    formData.append('Thumbnail', thumbnailFile);
  }
  return formData;
};

// ── Service ───────────────────────────────────────────────────────────────────

export const adminEventService = {

  /** GET — Fetch all events (admin only) */
  getAllEvents: async (): Promise<ApiEvent[]> => {
    const response = await apiClient.get('/admin/events');
    const data = response.data.data ?? response.data;
    // Map status from numbers to strings if necessary
    return data.map((event: any) => ({
      ...event,
      status: mapStatusToString(event.status),
      thumbnailUrl: ensureImageUrl(event.thumbnailUrl)
    }));
  },

  /** POST — Tạo sự kiện mới (có file ảnh) */
  createEvent: async (
    eventData: EventFormData,
    thumbnailFile?: File | null
  ): Promise<ApiEvent> => {
    const formData = buildFormData(eventData, thumbnailFile);
    const response = await apiClient.post('/admin/events', formData);
    return response.data.data ?? response.data;
  },

  /** PATCH — Cập nhật sự kiện theo ID */
  updateEvent: async (
    id: string,
    eventData: EventFormData,
    thumbnailFile?: File | null
  ): Promise<ApiEvent> => {
    const formData = buildFormData(eventData, thumbnailFile);
    const response = await apiClient.put(`/admin/events/${id}`, formData);
    return response.data.data ?? response.data;
  },

  /** DELETE — Xóa sự kiện theo ID */
  deleteEvent: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/events/${id}`);
  },

  // ── AR Frame APIs ──────────────────────────────────────────────────────────

  /** GET — Lấy danh sách Frame của một sự kiện */
  getEventFrames: async (eventId: string): Promise<ArFrame[]> => {
    const response = await apiClient.get(`/admin/events/${eventId}/frames`);
    const data = response.data.data ?? response.data;
    return data.map((f: any) => ({
      id: f.id,
      name: f.frameName || f.name,
      assetUrl: ensureImageUrl(f.frameUrl || f.assetUrl),
      isActive: f.isActive
    }));
  },

  /** POST — Tải lên Frame mới cho một sự kiện */
  uploadFrame: async (eventId: string, frameName: string, file: File): Promise<ArFrame> => {
    const formData = new FormData();
    formData.append('frameName', frameName);
    formData.append('file', file);
    const response = await apiClient.post(`/admin/events/${eventId}/frames`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const f = response.data.data ?? response.data;
    return {
      id: f.id,
      name: f.frameName || f.name,
      assetUrl: f.frameUrl || f.assetUrl,
      isActive: f.isActive
    };
  },

  /** PATCH — Bật/Tắt trạng thái hoạt động của Frame */
  toggleFrameStatus: async (frameId: string): Promise<ArFrame> => {
    const response = await apiClient.patch(`/admin/frames/${frameId}/toggle`);
    return response.data.data ?? response.data;
  },

  /** DELETE — Xóa vĩnh viễn Frame */
  deleteFrame: async (frameId: string): Promise<void> => {
    await apiClient.delete(`/admin/frames/${frameId}`);
  },
};

import { apiClient } from './apiClient';

export interface UserFanInsight {
  userId: string;
  name: string;
  email: string;
  totalPhotos: number;
  totalMessages: number;
  usedFrames: string;
  engagementScore: number;
}

export interface FramePreference {
  frameId: string;
  frameName: string;
  usageCount: number;
  percentage: number;
}

export interface FanWishwallMessage {
  content: string;
  createdAt: string;
  sentiment: number;
}

export interface FanProfile {
  userId: string;
  name: string;
  framePreferences: FramePreference[];
  recentMessages: FanWishwallMessage[];
}

export const adminFanInsightsService = {
  getFanInsights: async (eventId: string): Promise<UserFanInsight[]> => {
    const response = await apiClient.get(`/admin/events/${eventId}/fan-insights?_t=${Date.now()}`);
    return response.data.data ?? response.data;
  },

  getFanProfile: async (eventId: string, userId: string): Promise<FanProfile> => {
    const response = await apiClient.get(`/admin/events/${eventId}/fan-insights/${userId}?_t=${Date.now()}`);
    return response.data.data ?? response.data;
  },

  getEventFrameStats: async (eventId: string): Promise<{ frames: { frameName: string, usage: number }[] }> => {
    const response = await apiClient.get(`/admin/events/${eventId}/analytics/frame-usage?_t=${Date.now()}`);
    return response.data.data ?? response.data;
  },
};

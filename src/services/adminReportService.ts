import { apiClient } from './apiClient';

export interface KeywordStat {
  keyword: string;
  frequency: number;
}

export interface HeatMapPoint {
  label: string;
  value: number;
}

export interface FrameUsageItem {
  frameId: string;
  frameName: string;
  usage: number;
}

export interface FrameUsageReport {
  totalPhotos: number;
  activeFrames: number;
  frames: FrameUsageItem[];
}

export interface WishwallReport {
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positiveRate: number;
  negativeRate: number;
  topKeywords: KeywordStat[];
}

export interface EventReport {
  eventId: string;
  eventName: string;
  generatedAt: string;
  totalTraffic: number;
  totalEngagement: number;
  conversionRate: number;
  averageSessionSeconds: number;
  frameUsage: FrameUsageReport;
  wishwall: WishwallReport;
  heatMap: HeatMapPoint[];
}

export const adminReportService = {
  getEventReport: async (eventId: string): Promise<EventReport> => {
    const response = await apiClient.get(`/admin/events/${eventId}/report`);
    return response.data.data ?? response.data;
  },
};

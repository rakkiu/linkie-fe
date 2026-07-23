import { apiClient } from './apiClient';

export interface AuditKpiResponse {
  period: { start: string; end: string };
  usageLogBased: { activeBusinesses: number; activeStaff: number };
  retroactiveEvidence: {
    totalOrganizerAccounts: number;
    organizersWithEvents: number;
    totalStaffAccounts: number;
    staffWithEventParticipation: number;
  };
}

export interface UserSnippet {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}

export interface AuditLogItem {
  id: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: string;
  ipAddress?: string;
  createdAt: string;
  user?: UserSnippet;
}

export const getAuditKpi = async (start?: string, end?: string): Promise<AuditKpiResponse> => {
  const params = new URLSearchParams();
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  const res = await apiClient.get(`/admin/usage/kpi?${params.toString()}`);
  return res.data.data;
};

export const getRecentUsage = async (limit: number = 50): Promise<AuditLogItem[]> => {
  const res = await apiClient.get(`/admin/usage/recent?limit=${limit}`);
  return res.data.data;
};

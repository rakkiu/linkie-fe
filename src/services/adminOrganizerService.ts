import { apiClient } from './apiClient';

export interface OrganizerDto {
  id: string;
  username: string;
  email: string;
  displayName: string;
  managedEventId: string;
  managedEventName: string;
  planTier: string;
}

export interface OrganizerListItemDto {
  id: string;
  username: string;
  email: string;
  displayName: string;
  managedEventId: string | null;
  managedEventName: string | null;
  eventEndTime: string | null;
  isExpired: boolean;
  planTier: string;
}

export interface CreateOrganizerRequest {
  username: string;
  email: string;
  password: string;
  displayName: string;
  managedEventId: string;
  planTier: string;
}

export interface UpdateOrganizerRequest {
  displayName: string;
  managedEventId: string;
  planTier: string;
}

const adminOrganizerService = {
  getAll: async (): Promise<OrganizerListItemDto[]> => {
    const res = await apiClient.get('/admin/organizers');
    return res.data.data;
  },

  create: async (data: CreateOrganizerRequest): Promise<OrganizerDto> => {
    const res = await apiClient.post('/admin/organizers', data);
    return res.data.data;
  },

  update: async (id: string, data: UpdateOrganizerRequest): Promise<void> => {
    await apiClient.put(`/admin/organizers/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/organizers/${id}`);
  },
};

export default adminOrganizerService;

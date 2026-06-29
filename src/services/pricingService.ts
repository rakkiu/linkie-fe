import { apiClient } from './apiClient';

export interface PricingRequestData {
  email: string;
  companyName: string;
  phoneNumber: string;
  website?: string;
  fanpage?: string;
  planId: string;
}

export interface PricingRequestDto extends PricingRequestData {
  id: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export const pricingService = {
  createRequest: async (data: PricingRequestData): Promise<any> => {
    const response = await apiClient.post('/pricing-requests', data);
    return response.data;
  },

  getAllRequests: async (status?: string): Promise<PricingRequestDto[]> => {
    const url = status && status !== 'All' ? `/pricing-requests?status=${status}` : '/pricing-requests';
    const response = await apiClient.get(url);
    return response.data.data; // data.data vì API trả về là ApiResponse<List<PricingRequestDto>>
  },

  updateStatus: async (id: string, status: 'Approved' | 'Rejected'): Promise<any> => {
    const response = await apiClient.put(`/pricing-requests/${id}/status`, { status });
    return response.data;
  },

  deleteRequest: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/pricing-requests/${id}`);
    return response.data;
  }
};

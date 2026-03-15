import axios from 'axios';
import { BASE_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './apiClient';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // We use a clean axios instance here to avoid the interceptor attaching a non-existent token for login
    const response = await axios.post(`${BASE_URL}/Auth/login`, {
      email,
      password,
    });
    
    // Response wrapper expected: { statusCode: 200, data: { accessToken: "..." } }
    const data = response.data.data ?? response.data;
    
    // Save tokens
    if (data.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    }
    if (data.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }
    
    return data;
  },

  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  forgotPassword: async (email: string): Promise<void> => {
    await axios.post(`${BASE_URL}/Auth/forgot-password`, { email });

  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await axios.post(`${BASE_URL}/Auth/reset-password`, { token, newPassword });
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await axios.post(`${BASE_URL}/Auth/change-password`, { currentPassword, newPassword });
  }
};

import axiosInstance from '../lib/axios';
import type { ApiResponse, LoginResponseDto, RegisterResponseDto } from '../types/auth';

export const authService = {
  /** POST /api/Auth/login */
  login: (email: string, password: string) =>
    axiosInstance
      .post<ApiResponse<LoginResponseDto>>('/api/Auth/login', { email, password })
      .then((r) => r.data),

  /** POST /api/Auth/logout */
  logout: (refreshToken: string) =>
    axiosInstance
      .post<ApiResponse<null>>('/api/Auth/logout', { refreshToken })
      .then((r) => r.data),

  /** POST /api/Auth/register */
  register: (name: string, email: string, password: string) =>
    axiosInstance
      .post<ApiResponse<RegisterResponseDto>>('/api/Auth/register', { name, email, password })
      .then((r) => r.data),

  /** POST /api/Auth/refresh */
  refreshToken: (refreshToken: string, accessToken?: string) =>
    axiosInstance
      .post<ApiResponse<LoginResponseDto>>('/api/Auth/refresh', { refreshToken, accessToken })
      .then((r) => r.data),

  /** POST /api/Auth/forgetPassword */
  forgotPassword: (email: string) =>
    axiosInstance
      .post<ApiResponse<null>>('/api/Auth/forgetPassword', { email })
      .then((r) => r.data),

  /** POST /api/Auth/resetPassword */
  resetPassword: (token: string, newPassword: string) =>
    axiosInstance
      .post<ApiResponse<null>>('/api/Auth/resetPassword', { token, newPassword })
      .then((r) => r.data),

  /** POST /api/Auth/changePassword  (requires Bearer token) */
  changePassword: (currentPassword: string, newPassword: string) =>
    axiosInstance
      .post<ApiResponse<null>>('/api/Auth/changePassword', { currentPassword, newPassword })
      .then((r) => r.data),
};

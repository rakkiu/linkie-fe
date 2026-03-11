import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token (skip for public auth endpoints) ─
const PUBLIC_AUTH = /\/api\/Auth\/(login|register|refresh|forgetPassword|resetPassword)/i;

axiosInstance.interceptors.request.use((config) => {
  const isPublic = PUBLIC_AUTH.test(config.url ?? '');
  if (!isPublic) {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ────────────────────────────────
let isRefreshing = false;
type QueueItem = { resolve: (token: string) => void; reject: (err: unknown) => void };
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    // Never try to refresh on auth endpoints — let the error bubble up to the component
    if (error.response?.status === 401 && !originalRequest._retry && !PUBLIC_AUTH.test(originalRequest.url ?? '')) {
      // Queue subsequent requests while refresh is in progress
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      const accessToken = localStorage.getItem('access_token');

      if (!refreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${BASE_URL}/api/Auth/refresh`, {
          refreshToken,
          accessToken,
        });
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
        localStorage.setItem('access_token', newAccess);
        localStorage.setItem('refresh_token', newRefresh);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return axiosInstance(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;

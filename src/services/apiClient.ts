import axios from 'axios';

// Constants
const API_ORIGIN = import.meta.env.VITE_API_URL?.trim() || 'https://localhost:7130';
export const BASE_URL = `${API_ORIGIN.replace(/\/+$/, '')}/api`;
export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

// Create generic Axios instance
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create event target for global 401 handling
export const eventBus = new EventTarget();

// Request Interceptor: Attach token automatically
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Nếu body là FormData, xóa Content-Type để browser/axios tự thêm boundary đúng
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Dispatch an event so React Context can catch it and log the user out
      eventBus.dispatchEvent(new Event('unauthorized'));
    }
    return Promise.reject(error);
  }
);

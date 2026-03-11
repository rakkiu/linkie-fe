import { createContext, useContext, useState } from 'react';
import { authService } from '../services/authService';
import type { AuthUser } from '../types/auth';

// ── Decode JWT payload without verification (browser-side only) ───────────────
function decodeJwt(token: string): Record<string, string> | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function userFromToken(token: string): AuthUser | null {
  const claims = decodeJwt(token);
  if (!claims) return null;
  return {
    id: claims['sub'] ?? '',
    name: claims['FullName'] ?? '',
    email: claims['email'] ?? '',
    role: claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? claims['role'] ?? '',
  };
}

// ── Context types ─────────────────────────────────────────────────────────────
interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Restore user from stored token on page load ───────────────────────────────
function initUser(): AuthUser | null {
  const token = localStorage.getItem('access_token');
  return token ? userFromToken(token) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(initUser);

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password);
    localStorage.setItem('access_token', res.data.accessToken);
    localStorage.setItem('refresh_token', res.data.refreshToken);
    setUser(userFromToken(res.data.accessToken));
  };

  // Google OAuth is handled separately; keep stub for UI compatibility
  const loginWithGoogle = async () => {
    throw new Error('Google OAuth is not configured yet.');
  };

  const register = async (name: string, email: string, password: string) => {
    await authService.register(name, email, password);
    // After registration, log the user in automatically
    await login(email, password);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token') ?? '';
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword);
  };

  const forgotPassword = async (email: string) => {
    await authService.forgotPassword(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    await authService.resetPassword(token, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, loginWithGoogle, register, logout, changePassword, forgotPassword, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { eventBus } from '../services/apiClient'; export type UserRole = 'admin' | 'staff' | 'organizer' | 'led' | 'user';

interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('linkie_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem('linkie_user', JSON.stringify(user));
    else localStorage.removeItem('linkie_user');
  }, [user]);

  // Global 401 handler
  useEffect(() => {
    const handleUnauthorized = () => {
      // Force logout if token expired
      authService.logout();
      setUser(null);
    };
    eventBus.addEventListener('unauthorized', handleUnauthorized);
    return () => eventBus.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    await authService.login(email, password);

    // Determine role from provided credentials logic or JWT payload (for now, simply mapping admin email to admin role)
    if (email.toLowerCase().includes('admin')) {
      setUser({ name: 'Admin', email, role: 'admin' });
    } else if (email.toLowerCase().includes('staff')) {
      setUser({ name: 'Staff User', email, role: 'staff' });
    } else if (email.toLowerCase().includes('organizer')) {
      setUser({ name: 'Organizer User', email, role: 'organizer' });
    } else if (email.toLowerCase().includes('led')) {
      setUser({ name: 'LED Display', email, role: 'led' });
    } else {
      const name = email.split('@')[0];
      setUser({ name, email, role: 'user' });
    }
  };

  const loginWithGoogle = async () => {
    setUser({ name: 'Google User', email: 'user@gmail.com', role: 'user' });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const register = async (name: string, email: string, _password: string) => {
    setUser({ name, email, role: 'user' });
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  }

  const forgotPassword = async (email: string) => {
    await authService.forgotPassword(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    await authService.resetPassword(token, newPassword);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, register, logout, forgotPassword, resetPassword, changePassword }}>
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

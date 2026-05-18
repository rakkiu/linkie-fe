import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { authService } from '../services/authService';
import { eventBus } from '../services/apiClient'; export type UserRole = 'admin' | 'staff' | 'organizer' | 'led' | 'user';

interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  id: string; // Added user ID
}

// Simple JWT decoder helper
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode JWT:', e);
    return null;
  }
};

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: () => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
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
    const res = await authService.login(email, password);

    if (res && res.accessToken) {
      const payload = decodeJWT(res.accessToken);
      if (payload) {
        // Extract claims from .NET JWT
        // Role claim usually: "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        const dotNetRole = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload["role"];
        const name = payload["FullName"] || payload["name"] || email.split('@')[0];
        const userId = payload["sub"] || payload["id"];
        
        // Map backend roll to frontend role enum
        let role: UserRole = 'user';
        if (dotNetRole) {
          const r = dotNetRole.toLowerCase();
          if (r === 'admin') role = 'admin';
          else if (r === 'staff') role = 'staff';
          else if (r === 'led') role = 'led';
          else if (r === 'organizer') role = 'organizer';
        }

        const newUser: AuthUser = { 
          name, 
          email: payload["email"] || email, 
          role,
          id: userId
        };
        setUser(newUser);
        return newUser;
      }
    }

    // Fallback logic if token decoding fails (old logic with slight improvement)
    let fallbackUser: AuthUser;
    if (email.toLowerCase().includes('admin')) {
      fallbackUser = { name: 'Admin', email, role: 'admin', id: '0' };
    } else if (email.toLowerCase().includes('staff')) {
      fallbackUser = { name: 'Staff User', email, role: 'staff', id: '0' };
    } else if (email.toLowerCase().includes('organizer')) {
      fallbackUser = { name: 'Organizer User', email, role: 'organizer', id: '0' };
    } else if (email.toLowerCase().includes('led')) {
      fallbackUser = { name: 'LED Display', email, role: 'led', id: '0' };
    } else {
      const name = email.split('@')[0];
      fallbackUser = { name, email, role: 'user', id: '0' };
    }
    setUser(fallbackUser);
    return fallbackUser;
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const res = await authService.googleLogin(idToken);
      
      if (res && res.accessToken) {
        const payload = decodeJWT(res.accessToken);
        if (payload) {
          const dotNetRole = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload["role"];
          const name = payload["FullName"] || payload["name"] || result.user.displayName || 'Google User';
          const userId = payload["sub"] || payload["id"];
          
          let role: UserRole = 'user';
          if (dotNetRole) {
            const r = dotNetRole.toLowerCase();
            if (r === 'admin') role = 'admin';
            else if (r === 'staff') role = 'staff';
            else if (r === 'led') role = 'led';
            else if (r === 'organizer') role = 'organizer';
          }

          const newUser: AuthUser = { 
            name, 
            email: result.user.email || '', 
            role,
            id: userId
          };
          setUser(newUser);
          return newUser;
        }
      }
      throw new Error("Failed to process Google Login response");
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    await authService.register(name, email, password);
    return await login(email, password);
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

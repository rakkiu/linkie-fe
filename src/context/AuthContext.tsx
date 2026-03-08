import { createContext, useContext, useState, useEffect } from 'react';

interface AuthUser {
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const login = async (email: string, _password: string) => {
    // Mock: in real app, call API here
    const name = email.split('@')[0];
    setUser({ name, email });
  };

  const loginWithGoogle = async () => {
    setUser({ name: 'Google User', email: 'user@gmail.com' });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const register = async (name: string, email: string, _password: string) => {
    setUser({ name, email });
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, register, logout }}>
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

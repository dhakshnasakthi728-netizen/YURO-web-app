import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { AuthUser } from '../types';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  connectionError: string;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
  updateUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const result = await api.auth.me();
      setUser(result.user);
      setConnectionError('');
      return result.user;
    } catch (error) {
      setConnectionError(
        error instanceof Error
          ? error.message
          : 'Could not connect to the YURO server.',
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    setUser(result.user);
    setConnectionError('');
    return result.user;
  }, []);

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      const result = await api.auth.register(fullName, email, password);
      setUser(result.user);
      setConnectionError('');
      return result.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
  }, []);

  const updateUser = useCallback((next: AuthUser | null) => {
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      connectionError,
      login,
      register,
      logout,
      refresh,
      updateUser,
    }),
    [
      user,
      loading,
      connectionError,
      login,
      register,
      logout,
      refresh,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

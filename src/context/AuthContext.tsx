import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  controlledLogin as apiControlledLogin,
  customerLogin as apiCustomerLogin,
  fetchCurrentUser,
  type LoginResponse,
} from '../api/auth';
import type { Role, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  ready: boolean;
  customerLogin: (
    email: string,
    password: string,
  ) => Promise<{ ok: true; role: Role } | { ok: false; error: string }>;
  controlledLogin: (
    email: string,
    password: string,
  ) => Promise<{ ok: true; role: Role } | { ok: false; error: string }>;
  acceptToken: (
    token: string,
  ) => Promise<{ ok: true; role: Role } | { ok: false; error: string }>;
  logout: () => void;
  isRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'hotel-os-auth';

interface StoredAuth {
  token: string;
  user: User;
}

function toUser(dto: {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
}): User {
  return {
    id: dto.id,
    name: dto.fullName,
    email: dto.email,
    phone: dto.phone ?? undefined,
    role: dto.role,
  };
}

function readStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.token || !parsed?.user?.email || !parsed?.user?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(auth: StoredAuth | null) {
  if (!auth) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

function applyLoginResponse(
  response: LoginResponse,
  setUser: (u: User | null) => void,
  setToken: (t: string | null) => void,
): User {
  const user = toUser(response.user);
  persist({ token: response.token, user });
  setToken(response.token);
  setUser(user);
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = readStored();
  const [user, setUser] = useState<User | null>(stored?.user ?? null);
  const [token, setToken] = useState<string | null>(stored?.token ?? null);
  const [ready, setReady] = useState(!stored?.token);

  useEffect(() => {
    if (!token) {
      setReady(true);
      return;
    }

    let cancelled = false;
    fetchCurrentUser(token)
      .then((dto) => {
        if (cancelled) return;
        const next = toUser(dto);
        persist({ token, user: next });
        setUser(next);
      })
      .catch(() => {
        if (cancelled) return;
        persist(null);
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const customerLogin = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiCustomerLogin(email.trim(), password);
      const next = applyLoginResponse(response, setUser, setToken);
      return { ok: true as const, role: next.role };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : 'Customer login failed',
      };
    }
  }, []);

  const controlledLogin = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiControlledLogin(email.trim(), password);
      const next = applyLoginResponse(response, setUser, setToken);
      return { ok: true as const, role: next.role };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : 'Staff login failed',
      };
    }
  }, []);

  const acceptToken = useCallback(async (jwt: string) => {
    try {
      const dto = await fetchCurrentUser(jwt);
      const next = toUser(dto);
      persist({ token: jwt, user: next });
      setToken(jwt);
      setUser(next);
      return { ok: true as const, role: next.role };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : 'Invalid session token',
      };
    }
  }, []);

  const logout = useCallback(() => {
    persist(null);
    setUser(null);
    setToken(null);
  }, []);

  const isRole = useCallback((role: Role) => user?.role === role, [user]);

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      customerLogin,
      controlledLogin,
      acceptToken,
      logout,
      isRole,
    }),
    [user, token, ready, customerLogin, controlledLogin, acceptToken, logout, isRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

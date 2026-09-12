import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getRememberPreference, getToken, setRememberPreference, setToken } from "../api/client";
import type { PublicUser, Role } from "../types";

interface AuthContextValue {
  user: PublicUser | null;
  ready: boolean;
  login: (email: string, password: string, role: Role, remember?: boolean) => Promise<PublicUser>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: PublicUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const { user: me } = await api.me();
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string, role: Role, remember = getRememberPreference()) => {
      setRememberPreference(remember);
      const { token, user: loggedIn } = await api.login(email, password, role);
      setToken(token, remember);
      setUser(loggedIn);
      return loggedIn;
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout, refresh, setUser }),
    [user, ready, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

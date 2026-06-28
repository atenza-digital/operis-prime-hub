import { createContext, useContext, useEffect, useState } from "react";
import { clearAuthToken, getAuthToken, getCurrentUser, login as loginRequest, logout as logoutRequest, setAuthToken, type AuthUser } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  hasPermission: (...permissions: string[]) => boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setAuthenticatedUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      if (!getAuthToken()) {
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        if (active) setUser(response.user);
      } catch {
        clearAuthToken();
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSession();
    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(email: string, password: string) {
    const response = await loginRequest({ email, password });
    setAuthToken(response.token);
    setUser(response.user);
    return response.user;
  }

  async function handleLogout() {
    try {
      await logoutRequest();
    } catch {
      // Mesmo se a sessao ja expirou no servidor, limpamos o estado local.
    } finally {
      clearAuthToken();
      setUser(null);
    }
  }

  function hasPermission(...permissions: string[]) {
    if (!user) return false;
    const granted = new Set(user.permissoes || []);
    return permissions.some((permission) => granted.has(permission));
  }

  return (
    <AuthContext.Provider value={{ user, loading, hasPermission, login: handleLogin, logout: handleLogout, setAuthenticatedUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}

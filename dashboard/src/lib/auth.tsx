import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface User {
  login: string;
  name: string;
  avatarUrl: string;
  email?: string;
}

interface AuthContext {
  user: User | null;
  hubToken: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthCtx = createContext<AuthContext>({
  user: null,
  hubToken: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

const USER_KEY = "plyknot-auth-user";
const TOKEN_KEY = "plyknot-hub-token";
const HUB_AUTH_URL = "https://hub.plyknot.com/auth/github";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hubToken, setHubToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore from localStorage + check for OAuth callback params
  useEffect(() => {
    // Check for OAuth callback parameters in URL
    const params = new URLSearchParams(window.location.search);
    const key = params.get("key");
    const login = params.get("login");
    const name = params.get("name");
    const avatar = params.get("avatar");

    if (key && login) {
      // OAuth callback — store and clean URL
      const newUser: User = {
        login,
        name: name ?? login,
        avatarUrl: avatar ?? "",
      };
      setUser(newUser);
      setHubToken(key);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      localStorage.setItem(TOKEN_KEY, key);
      // Clean callback params from URL
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      // Restore from localStorage
      const storedUser = localStorage.getItem(USER_KEY);
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem(USER_KEY);
        }
      }
      if (storedToken) {
        setHubToken(storedToken);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(() => {
    // Redirect to hub OAuth with dashboard callback URL
    const callbackUrl = `${window.location.origin}/login`;
    window.location.href = `${HUB_AUTH_URL}?redirect=${encodeURIComponent(callbackUrl)}`;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setHubToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, hubToken, isLoading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

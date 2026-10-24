import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loginUser, logoutUser, restoreSession, setAccessToken } from "../services/api";

const AuthContext = createContext(null);
const USER_STORAGE_KEY = "splitzy-user";

function readStoredUser() {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let mounted = true;
    restoreSession()
      .then((sessionUser) => {
        if (!mounted) return;
        const cachedUser = readStoredUser() || {};
        const restoredUser = { ...cachedUser, id: sessionUser.userId };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(restoredUser));
        setUser(restoredUser);
      })
      .catch(() => {
        if (!mounted) return;
        setAccessToken(null);
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
      })
      .finally(() => { if (mounted) setIsLoading(false); });

    const onExpired = () => {
      if (!mounted) return;
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
    };
    window.addEventListener("dostidue:session-expired", onExpired);
    return () => {
      mounted = false;
      window.removeEventListener("dostidue:session-expired", onExpired);
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setAuthError("");
    const nextUser = await loginUser({ email, password });
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try { await logoutUser(); }
    finally {
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, isLoading, authError, isAuthenticated: Boolean(user), login, logout, setAuthError }), [user, isLoading, authError, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

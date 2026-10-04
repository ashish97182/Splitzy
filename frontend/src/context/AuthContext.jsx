import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);
const USER_STORAGE_KEY = "splitzy-user";

function readStoredUser() {
  try {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login(nextUser) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
      },
      logout() {
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

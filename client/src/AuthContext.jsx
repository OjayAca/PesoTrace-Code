import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getStoredToken();

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then(({ user: currentUser }) => {
        setUser(currentUser);
      })
      .catch(() => {
        api.setToken(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const value = {
    user,
    loading,
    async login(credentials) {
      const response = await api.login(credentials);
      api.setToken(response.token);
      setUser(response.user);
    },
    async register(details) {
      const response = await api.register(details);
      api.setToken(response.token);
      setUser(response.user);
    },
    logout() {
      api.setToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

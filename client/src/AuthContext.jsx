import { createContext, useContext, useEffect, useState } from "react";
import { api, AUTH_EXPIRED_EVENT } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(({ user: currentUser }) => {
        setUser(currentUser);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    function handleAuthExpired() {
      setUser(null);
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const value = {
    user,
    loading,
    setCurrentUser: setUser,
    async login(credentials) {
      const response = await api.login(credentials);
      setUser(response.user);
    },
    async register(details) {
      const response = await api.register(details);
      setUser(response.user);
    },
    async logout() {
      await api.logout();
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

import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me(token)
      .then(setUser)
      .catch(() => {
        setToken(null);
        localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function login(email, password) {
    const { access_token } = await authApi.login(email, password);
    localStorage.setItem("token", access_token);
    setToken(access_token);
    const me = await authApi.me(access_token);
    setUser(me);
  }

  async function register(email, password, fullName) {
    const { access_token } = await authApi.register(email, password, fullName);
    localStorage.setItem("token", access_token);
    setToken(access_token);
    const me = await authApi.me(access_token);
    setUser(me);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

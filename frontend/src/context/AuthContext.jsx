import { createContext, useContext, useState } from "react";
import { disconnectSocket } from "../socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("chat_user");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [token, setToken] = useState(() => localStorage.getItem("chat_token") || null);

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem("chat_user", JSON.stringify(userData));
    localStorage.setItem("chat_token", jwtToken);
  };

  const logout = () => {
    disconnectSocket();
    setUser(null);
    setToken(null);
    localStorage.removeItem("chat_user");
    localStorage.removeItem("chat_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

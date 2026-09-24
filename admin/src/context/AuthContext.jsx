import { createContext, useContext, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("adminUser");
    return stored ? JSON.parse(stored) : null;
  });

  async function login(phone, password) {
    const res = await api.post("/auth/login", { phone, password });
    if (res.data.user.role !== "admin") {
      throw new Error("This account doesn't have admin access");
    }
    localStorage.setItem("adminToken", res.data.token);
    localStorage.setItem("adminUser", JSON.stringify(res.data.user));
    setUser(res.data.user);
  }

  function logout() {
    // Tell the server too, so this device stops counting as an active
    // session on the Login Activity page. Clearing the browser alone would
    // leave the token valid and the session sitting there looking live.
    api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
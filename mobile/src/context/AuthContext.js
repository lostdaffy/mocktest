import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStoredUser() {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
      setLoading(false);
    }
    loadStoredUser();
  }, []);

  async function login(phone, password) {
    const res = await api.post("/auth/login", { phone, password });
    await AsyncStorage.setItem("token", res.data.token);
    await AsyncStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
  }

  async function signup(name, phone, password, examGoals, email, referralCode) {
    const res = await api.post("/auth/signup", { name, phone, password, examGoals, email, referralCode });
    await AsyncStorage.setItem("token", res.data.token);
    await AsyncStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
  }

  async function logout() {
    await AsyncStorage.multiRemove(["token", "user"]);
    setUser(null);
  }

  // Re-fetches the latest user data from the backend (e.g. after a payment,
  // to get the freshly-updated subscription status without re-login).
  async function refreshUser() {
    const res = await api.get("/auth/me");
    await AsyncStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
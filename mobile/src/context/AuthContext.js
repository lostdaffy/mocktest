import { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";
import AppAlert from "../components/AppAlert";
import { registerForPushNotifications } from "../utils/notifications";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);
  userRef.current = user;

  useEffect(() => {
    async function loadStoredUser() {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
      setLoading(false);
    }
    loadStoredUser();
  }, []);

  // Registered once, lives for the app's lifetime - not tied to any one
  // screen. Catches the "logged in on another device" response (see
  // middleware/auth.js's session check) from ANY API call, anywhere in the
  // app, and forces this device back to the login screen with a clear
  // explanation instead of a confusing string of failed requests.
  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const code = error.response?.data?.code;
        if ((code === "SESSION_REPLACED" || code === "TOKEN_INVALID") && userRef.current) {
          await AsyncStorage.multiRemove(["token", "user"]);
          setUser(null);
          if (code === "SESSION_REPLACED") {
            AppAlert.alert(
              "Logged out",
              "Your account was signed in on another device, so you've been logged out here.",
              [{ text: "OK" }],
              { type: "warning" }
            );
          }
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptorId);
  }, []);

  async function persistSession(data) {
    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    // Fire-and-forget: covers every login path (password, OTP,
    // signup) since they all funnel through here. Never awaited by the
    // caller - a slow/denied permission prompt must not block login.
    registerForPushNotifications(api);
  }

  async function login(phone, password) {
    const res = await api.post("/auth/login", { phone, password });
    await persistSession(res.data);
  }

  // Requests an OTP for the given phone (used for OTP login and password reset).
  async function requestOtp(phone) {
    const res = await api.post("/auth/request-otp", { phone });
    return res.data;
  }

  // Logs in using a mobile OTP instead of a password.
  async function loginWithOtp(phone, otp) {
    const res = await api.post("/auth/login-otp", { phone, otp });
    await persistSession(res.data);
  }

  async function sendSignupOtp(phone) {
    const res = await api.post("/auth/signup/request-otp", { phone });
    return res.data;
  }

  async function signup(name, phone, password, examGoals, email, referralCode, otp) {
    const res = await api.post("/auth/signup", { name, phone, password, examGoals, email, referralCode, otp });
    await persistSession(res.data);
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
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        signup,
        sendSignupOtp,
        logout,
        refreshUser,
        requestOtp,
        loginWithOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
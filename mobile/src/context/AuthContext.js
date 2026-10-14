import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";
import AppAlert from "../components/AppAlert";
import { registerForPushNotifications } from "../utils/notifications";

const AuthContext = createContext(null);

const STORE_URL = "https://play.google.com/store/apps/details?id=com.satya.smarttestengine";

// How often coming back to the app re-reads the account, at most. Often
// enough that a plan the admin just granted shows up the next time the
// student opens the app; rare enough not to cost a request per glance.
const REFRESH_EVERY_MS = 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);
  userRef.current = user;
  const lastRefresh = useRef(0);

  // Re-reads the account from the server: plan, expiry, exams. Quiet on
  // failure - an offline student keeps what they had.
  async function refreshUser({ quiet = false } = {}) {
    try {
      const res = await api.get("/auth/me");
      lastRefresh.current = Date.now();
      await AsyncStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      if (!quiet) throw err;
      return null;
    }
  }

  useEffect(() => {
    async function loadStoredUser() {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
      setLoading(false);
      // Then the fresh copy: a plan granted from the admin panel since the
      // last sign-in shows straight away, with no need to sign in again.
      if (stored) refreshUser({ quiet: true });
      // And the push token, every launch - not only at sign-in. A student
      // who signed in once on an app that could not register (or who later
      // allowed notifications) would otherwise never get a reminder.
      if (stored) registerForPushNotifications(api);
    }
    loadStoredUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // And whenever the app comes back to the front.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && userRef.current && Date.now() - lastRefresh.current > REFRESH_EVERY_MS) {
        refreshUser({ quiet: true });
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registered once, lives for the app's lifetime - not tied to any one
  // screen. Catches "signed in on another device", "signed out from another
  // device" and "update the app" from ANY API call, anywhere in the app.
  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const data = error.response?.data || {};
        const code = data.code;
        if ((code === "SESSION_REPLACED" || code === "TOKEN_INVALID") && userRef.current) {
          await AsyncStorage.multiRemove(["token", "user"]);
          setUser(null);
          if (code === "SESSION_REPLACED") {
            AppAlert.alert(
              "Signed out",
              "Your account was signed in on another device, so you have been signed out here.",
              [{ text: "OK" }],
              { type: "warning" }
            );
          } else if (data.reason === "SESSION_REVOKED") {
            AppAlert.alert("Signed out", "You were signed out of this device from your account settings.", [{ text: "OK" }], { type: "warning" });
          } else if (data.reason === "PLAN_CHANGED") {
            AppAlert.alert("Your plan was updated", "Please sign in again to see it.", [{ text: "OK" }], { type: "info" });
          }
        } else if (code === "UPDATE_REQUIRED") {
          AppAlert.alert(
            "Update the app",
            data.message || "Please update Rankveer from the Play Store to open this.",
            [
              { text: "Later", style: "cancel" },
              { text: "Update", onPress: () => Linking.openURL(STORE_URL).catch(() => {}) },
            ],
            { type: "info" }
          );
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptorId);
  }, []);

  async function persistSession(data) {
    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
    lastRefresh.current = Date.now();
    setUser(data.user);
    // Fire-and-forget: covers every login path (password login
    // and signup) since they all funnel through here. Never awaited by the
    // caller - a slow/denied permission prompt must not block login.
    registerForPushNotifications(api);
  }

  async function login(phone, password) {
    const res = await api.post("/auth/login", { phone, password });
    await persistSession(res.data);
  }

  // email is sent along so the server can reject an already-used email
  // before paying for the SMS.
  async function sendSignupOtp(phone, email) {
    const res = await api.post("/auth/signup/request-otp", { phone, email });
    return res.data;
  }

  async function signup(name, phone, password, examGoals, email, referralCode, otp) {
    const res = await api.post("/auth/signup", { name, phone, password, examGoals, email, referralCode, otp });
    await persistSession(res.data);
  }

  async function logout() {
    // Fire-and-forget: tells the server to end this session so the token
    // stops working immediately instead of staying valid until it expires.
    // Never awaited - a student on a dead network must still get logged out.
    api.post("/auth/logout").catch(() => {});
    await AsyncStorage.multiRemove(["token", "user"]);
    setUser(null);
  }

  // Permanently deletes the account on the server (password required),
  // then clears this device the same way logout does.
  async function deleteAccount(password) {
    await api.post("/auth/delete-account", { password });
    await AsyncStorage.multiRemove(["token", "user"]);
    setUser(null);
  }

  // Changes the exam(s) the student is preparing for, from Profile.
  async function updateExamGoals(examGoals) {
    await api.patch("/auth/profile", { examGoals });
    return refreshUser();
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
        deleteAccount,
        refreshUser,
        updateExamGoals,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

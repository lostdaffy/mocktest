import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚠️ SWITCH THIS TO https://api.rankveer.com/api BEFORE THE PLAY STORE RELEASE.
//
// This value is compiled into the installed app, so it is the one URL in the
// codebase that cannot be changed after release without shipping an update -
// and plenty of users never update. Pointing it at the hosting provider's
// own URL means that the day we move off Render, every app already on a
// student's phone stops working. Our own domain avoids that entirely: we
// just repoint DNS and installed apps keep working.
//
// It still says onrender.com only because api.rankveer.com isn't live yet
// (the registrar's nameserver change is stuck). Nothing else blocks the
// switch - flip this one line once https://api.rankveer.com/api/health
// responds, then rebuild.
const API_URL = "https://mocktest-6gci.onrender.com/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

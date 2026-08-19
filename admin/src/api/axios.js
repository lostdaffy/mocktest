import axios from "axios";

// IMPORTANT: set VITE_API_URL in your hosting provider's environment
// variables (Vercel/Netlify/etc.) so the build always points at your real
// backend. The fallback below is a safety net for local development only -
// it should never be the thing actually running in production.
const FALLBACK_API_URL = "https://mocktest-6gci.onrender.com/api";
const API_URL = import.meta.env.VITE_API_URL || FALLBACK_API_URL;

if (!import.meta.env.VITE_API_URL) {
  console.warn(
    `VITE_API_URL is not set - falling back to ${FALLBACK_API_URL}. ` +
      "Confirm this is actually your current backend before relying on it in production."
  );
}

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
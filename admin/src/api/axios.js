import axios from "axios";

// Set VITE_API_URL in a .env file at the admin-panel root, e.g.:
// VITE_API_URL=http://localhost:5000/api   (local dev)
// VITE_API_URL=https://your-app.onrender.com/api   (production)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

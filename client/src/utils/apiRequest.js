import axios from "axios";
import useAuthStore from "./authStore";

const apiRequest = axios.create({
  baseURL: import.meta.env.VITE_API_ENDPOINT || "http://localhost:11111",
  withCredentials: true,
});

// Gắn token tự động
apiRequest.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiRequest;

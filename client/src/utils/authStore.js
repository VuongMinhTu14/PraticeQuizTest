import { create } from "zustand";
import { persist } from "zustand/middleware";
import apiRequest from "./apiRequest";

const API_BASE =
  import.meta.env.VITE_API_ENDPOINT || "http://localhost:11111";

const normalizeUser = (user) => {
  if (!user) return null;

  let profileImage = user.profileImage || null;

  // nếu backend trả path tương đối => tự nối domain
  if (profileImage && !profileImage.startsWith("http")) {
    profileImage = `${API_BASE}${profileImage}`;
  }

  return {
    ...user,
    profileImage,
  };
};

const useAuthStore = create(
  persist(
    (set) => ({
      currentUser: null,
      token: null,

      // === SET AUTH (LOGIN) ===
      setAuth: ({ user, token }) => {
        const normalized = normalizeUser(user);
        set({ currentUser: normalized, token });
      },

      // === SET USER (cập nhật profile: name, avatar...) ===
      setCurrentUser: (user) => {
        const normalized = normalizeUser(user);
        set({ currentUser: normalized });
      },

      setToken: (token) => set({ token }),

      // === LOGIN API (option, nếu muốn gọi ở đây) ===
      login: async (email, password) => {
        const res = await apiRequest.post("/user/login", { email, password });
        const { user, token } = res.data;

        const normalized = normalizeUser(user);

        set({ currentUser: normalized, token });
      },

      // === LOGOUT ===
      logout: () => set({ currentUser: null, token: null }),
    }),
    {
      name: "pq-auth",
      partialize: (state) => ({
        currentUser: state.currentUser,
        token: state.token,
      }),
    }
  )
);

export default useAuthStore;

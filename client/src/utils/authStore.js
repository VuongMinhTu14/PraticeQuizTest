import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      currentUser: null,   // { id, username, displayName, email, ... }
      token: null,

      setAuth: ({ user, token }) => set({ currentUser: user, token }),
      setCurrentUser: (user) => set({ currentUser: user }),
      setToken: (token) => set({ token }),
      logout: () => set({ currentUser: null, token: null }),
    }),
    { name: "pq-auth" } // key trong localStorage
  )
);

export default useAuthStore;

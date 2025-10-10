import { create } from "zustand";

const useThemeStore = create((set) => ({
  // 'light' cho Dashboard/Practice, 'dark' cho Game
  mode: "light",
  setMode: (mode) => set({ mode }),
}));

export default useThemeStore;

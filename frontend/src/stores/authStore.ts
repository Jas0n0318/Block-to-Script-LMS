import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  username: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  student_token: string | null;
  setAuth: (user: User, token: string, student_token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      student_token: null,
      setAuth: (user, token, student_token) => set({ user, token, student_token }),
      logout: () => set({ user: null, token: null, student_token: null }),
    }),
    {
      name: "auth-storage",
    }
  )
);

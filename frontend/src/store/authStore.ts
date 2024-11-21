import { create } from "zustand";
import axios from "axios";

import { AuthState } from "@/types";

const API_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000/api/auth"
    : "/api/auth";

axios.defaults.withCredentials = true;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  error: null,
  isLoading: false,
  isCheckingAuth: true,
  message: null,

  signup: async (email, password, username) => {
    set({ isLoading: true, error: null, message: null });
    try {
      const response = await axios.post(`${API_URL}/signup`, {
        email,
        password,
        username,
      });

      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      set({ message: response.data.message });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.message || "Error signing up";
        set({ error: errorMessage, isLoading: false });
      } else {
        set({
          error: "An unexpected error occurred. Please try again later.",
          isLoading: false,
        });
      }
      throw error;
    }
  },
}));

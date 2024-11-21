import { create } from "zustand";
import axios from "axios";
import { AuthState, ValidationError } from "@/types";

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
  generalErrors: [],
  emailError: null,
  passwordError: null,
  usernameError: null,

  signup: async (email, password, username) => {
    set({
      isLoading: true,
      error: null,
      message: null,
      emailError: null,
      passwordError: null,
      usernameError: null,
      generalErrors: [],
    });

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
        message: response.data.message,
        generalErrors: [],
      });
    } catch (error) {
      set({ isLoading: false });

      if (axios.isAxiosError(error)) {
        const { data } = error.response!;

        // Handle validation errors
        if (data.errors) {
          const validationErrors = data.errors || [];

          const fieldErrors = validationErrors.reduce(
            (
              acc: Record<keyof AuthState, string[] | null>,
              err: ValidationError,
            ) => {
              const field = err.path?.[0]; // Getting the field name (e.g., "email" or "username")

              if (field) {
                const key = `${field}Error` as keyof AuthState;
                if (acc[key]) {
                  acc[key]?.push(err.message);
                } else {
                  acc[key] = [err.message];
                }
              }
              return acc;
            },
          );

          set((state) => ({
            ...state,
            ...fieldErrors,
            isLoading: false,
          }));
        }

        if (data.success === false && data.message) {
          set({
            generalErrors: [data.message],
            isLoading: false,
          });
        }
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

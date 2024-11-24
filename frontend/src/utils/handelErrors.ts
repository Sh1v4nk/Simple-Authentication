import axios from "axios";
import { AuthState, ValidationError } from "@/types";

export const handleError = (
  error: unknown,
  set: (
    updater: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>),
  ) => void,
) => {
  set({ isLoading: false });

  if (axios.isAxiosError(error)) {
    const { data } = error.response!;

    // Handle validation errors
    if (data.errors) {
      const validationErrors = data.errors || [];

      const fieldErrors = validationErrors.reduce(
        (acc: Record<keyof AuthState, string[] | null>, err: ValidationError) => {
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
        {},
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
};

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
        const { data, status } = error.response!;

        // Handle rate limiting (429) and account lockout (423)
        if (status === 429) {
            const retryAfter = data.retryAfter || 900; // Default to 15 minutes in seconds
            const minutes = Math.ceil(retryAfter / 60);

            set({
                generalErrors: [
                    `Rate limit exceeded. Please try again in ${minutes} minutes.`,
                ],
                isLoading: false,
                rateLimited: true,
                rateLimitRetryAfter: retryAfter,
            });
            return;
        }

        if (status === 423) {
            set({
                generalErrors: [
                    data.message ||
                        "Account temporarily locked. Please try again later.",
                ],
                isLoading: false,
                accountLocked: true,
                lockedUntil: data.lockedUntil,
            });
            return;
        }

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

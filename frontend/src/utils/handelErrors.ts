import axios from "@/utils/axiosConfig";
import { AuthState } from "@/types";

type ValidationIssue = {
    field?: string;
    message: string;
};

const fieldToStateKey: Record<
    string,
    keyof Pick<
        AuthState,
        "emailError" | "passwordError" | "usernameError" | "tokenError"
    >
> = {
    email: "emailError",
    password: "passwordError",
    username: "usernameError",
    token: "tokenError",
};

const normalizeValidationIssues = (errors: unknown): ValidationIssue[] => {
    if (!Array.isArray(errors)) return [];

    return errors
        .map((err): ValidationIssue | null => {
            if (typeof err === "string") {
                const separatorIndex = err.indexOf(":");

                if (separatorIndex === -1) {
                    return { message: err.trim() };
                }

                const field = err.slice(0, separatorIndex).trim();
                const message = err.slice(separatorIndex + 1).trim();

                return {
                    field: field || undefined,
                    message: message || err,
                };
            }

            if (err && typeof err === "object") {
                const issue = err as {
                    field?: unknown;
                    path?: unknown;
                    message?: unknown;
                };

                const fieldFromPath = Array.isArray(issue.path)
                    ? issue.path[0]
                    : undefined;
                const field =
                    typeof issue.field === "string"
                        ? issue.field
                        : typeof fieldFromPath === "string"
                          ? fieldFromPath
                          : undefined;
                const message =
                    typeof issue.message === "string"
                        ? issue.message
                        : "Invalid input";

                return { field, message };
            }

            return null;
        })
        .filter((issue): issue is ValidationIssue => issue !== null);
};

export const handleError = (
    error: unknown,
    set: (
        updater: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>),
    ) => void,
) => {
    set({ isLoading: false });

    if (axios.isAxiosError(error)) {
        const data = error.response?.data as
            | {
                  success?: boolean;
                  message?: string;
                  errors?: unknown;
              }
            | undefined;

        // Handle validation errors
        const issues = normalizeValidationIssues(data?.errors);
        if (issues.length > 0) {
            const fieldErrors: Pick<
                AuthState,
                "emailError" | "passwordError" | "usernameError" | "tokenError"
            > = {
                emailError: null,
                passwordError: null,
                usernameError: null,
                tokenError: null,
            };
            const generalErrors: string[] = [];

            for (const issue of issues) {
                const key = issue.field ? fieldToStateKey[issue.field] : undefined;

                if (!key) {
                    generalErrors.push(issue.message);
                    continue;
                }

                if (!fieldErrors[key]) {
                    fieldErrors[key] = [issue.message];
                    continue;
                }

                fieldErrors[key]?.push(issue.message);
            }

            set((state) => ({
                ...state,
                ...fieldErrors,
                generalErrors,
                isLoading: false,
            }));

            throw error;
        }

        if (data?.success === false && data.message) {
            set({
                generalErrors: [data.message],
                isLoading: false,
            });

            throw error;
        }
    }

    set({
        error: "An unexpected error occurred. Please try again later.",
        isLoading: false,
    });

    throw error;
};

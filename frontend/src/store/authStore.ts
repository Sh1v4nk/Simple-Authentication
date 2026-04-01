import { create } from "zustand";
import axios from "@/utils/axiosConfig";
import { AuthState } from "@/types";
import { handleError } from "@/utils/handelErrors";

type QueuedRequest = {
    resolve: () => void;
    reject: (error: unknown) => void;
};

const VERIFICATION_EMAIL_STORAGE_KEY = "verificationEmail";

const getStoredVerificationEmail = (): string | null => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(VERIFICATION_EMAIL_STORAGE_KEY);
};

const setStoredVerificationEmail = (email: string | null): void => {
    if (typeof window === "undefined") return;

    if (!email) {
        window.sessionStorage.removeItem(VERIFICATION_EMAIL_STORAGE_KEY);
        return;
    }

    window.sessionStorage.setItem(VERIFICATION_EMAIL_STORAGE_KEY, email);
};

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

const processQueue = (error: unknown) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve();
        }
    });

    failedQueue = [];
};

// Create a flag to prevent interceptor interference with auth verification
let isVerifyingAuth = false;

axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Check if error is 401 and we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Don't try to refresh the /refresh endpoint itself to prevent infinite loops
            if (originalRequest.url?.includes("/refresh")) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // If already refreshing, queue the request
                return new Promise<void>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        return axios(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshResponse = await axios.post("/refresh");

                if (refreshResponse.status === 200) {
                    processQueue(null);

                    // Always retry the request after successful refresh
                    return axios(originalRequest);
                } else {
                    throw new Error(
                        `Refresh failed with status: ${refreshResponse.status}`,
                    );
                }
            } catch (refreshError) {
                processQueue(refreshError);

                // Refresh failed, clear auth state without making additional requests
                useAuthStore.setState({
                    user: null,
                    isAuthenticated: false,
                    error: null,
                    isLoading: false,
                    isCheckingAuth: false,
                });

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    verificationEmail: getStoredVerificationEmail(),
    isAuthenticated: false,
    error: null,
    isLoading: false,
    isCheckingAuth: true,
    message: null,
    generalErrors: [],
    emailError: null,
    passwordError: null,
    usernameError: null,
    tokenError: [],

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
            const response = await axios.post("/signup", {
                email,
                password,
                username,
            });

            set({
                user: response.data.user,
                verificationEmail: response.data.user?.email ?? null,
                isAuthenticated: true,
                isLoading: false,
                message: response.data.message,
                generalErrors: [],
            });
            setStoredVerificationEmail(response.data.user?.email ?? null);
        } catch (error) {
            set({ isLoading: false });
            handleError(error, set);
        }
    },

    signin: async (email, password) => {
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
            const response = await axios.post("/signin", {
                email,
                password,
            });

            set({
                user: response.data.user,
                verificationEmail: null,
                isAuthenticated: true,
                isLoading: false,
                message: response.data.message,
                generalErrors: [],
            });
            setStoredVerificationEmail(null);
        } catch (error) {
            const status = (error as { response?: { status?: number } })?.response
                ?.status;
            if (status === 403) {
                set({ verificationEmail: email });
                setStoredVerificationEmail(email);
            }
            set({ isLoading: false });
            handleError(error, set);
        }
    },

    signout: async () => {
        set({ isLoading: true, error: null });
        try {
            await axios.post("/signout");
            set({
                user: null,
                verificationEmail: null,
                isAuthenticated: false,
                error: null,
                isLoading: false,
                message: null,
                generalErrors: [],
                emailError: null,
                passwordError: null,
                usernameError: null,
                tokenError: [],
            });
            setStoredVerificationEmail(null);
        } catch (error) {
            // Always clear auth state even if signout request fails
            set({
                user: null,
                verificationEmail: null,
                isAuthenticated: false,
                error: null,
                isLoading: false,
            });
            setStoredVerificationEmail(null);
            handleError(error, set);
        }
    },

    logoutAllDevices: async () => {
        set({ isLoading: true, error: null });
        try {
            await axios.post("/revoke-all");
            set({
                user: null,
                verificationEmail: null,
                isAuthenticated: false,
                error: null,
                isLoading: false,
                message: "Signed out from all devices successfully",
                generalErrors: [],
                emailError: null,
                passwordError: null,
                usernameError: null,
                tokenError: [],
            });
            setStoredVerificationEmail(null);
        } catch (error) {
            // Even if revoke-all fails, clear local state
            set({
                user: null,
                verificationEmail: null,
                isAuthenticated: false,
                error: null,
                isLoading: false,
            });
            setStoredVerificationEmail(null);
            handleError(error, set);
        }
    },

    refreshToken: async () => {
        try {
            const response = await axios.post("/refresh");
            return response.data;
        } catch (error) {
            // Clear auth state without triggering signout
            set({
                user: null,
                verificationEmail: null,
                isAuthenticated: false,
                error: null,
                isLoading: false,
                isCheckingAuth: false,
            });
            setStoredVerificationEmail(null);
            throw error;
        }
    },

    verifyEmail: async (emailCode) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axios.post("/verify-email", {
                emailCode,
            });
            set({
                user: response.data.user,
                verificationEmail: null,
                isAuthenticated: true,
                isLoading: false,
                message: response.data.message,
                generalErrors: [],
            });
            setStoredVerificationEmail(null);
            return response.data;
        } catch (error) {
            set({ isLoading: false });
            handleError(error, set);
        }
    },

    resendOTP: async (emailArg) => {
        set({ error: null });
        try {
            const email =
                emailArg ??
                get().verificationEmail ??
                getStoredVerificationEmail() ??
                get().user?.email;
            if (!email) {
                set({
                    generalErrors: ["Unable to resend OTP. Please sign in again."],
                    error: "Unable to resend OTP.",
                });
                return;
            }

            const response = await axios.post("/resend-otp", { email });
            set({
                message: response.data.message,
                generalErrors: [],
            });
        } catch (error) {
            handleError(error, set);
        }
    },

    forgotPassword: async (email) => {
        set({ isLoading: true, error: null, emailError: null, message: null });
        try {
            const response = await axios.post("/forgot-password", {
                email,
            });
            set({ isLoading: false, message: response.data.message });
        } catch (error) {
            set({ isLoading: false });
            handleError(error, set);
        }
    },

    resetPassword: async (token, password) => {
        set({ isLoading: true, error: null, passwordError: null });
        try {
            const response = await axios.post(`/reset-password/${token}`, {
                password,
            });
            set({
                isLoading: false,
                message: response.data.message,
                generalErrors: [],
                tokenError: [],
            });
        } catch (error) {
            set({ isLoading: false });
            handleError(error, set);
        }
    },

    verifyAuth: async () => {
        // Prevent multiple simultaneous verification attempts
        if (isVerifyingAuth) {
            return;
        }

        set({ isCheckingAuth: true, error: null });
        isVerifyingAuth = true;

        try {
            const response = await axios.get("/verify-auth");
            const verificationEmail = response.data.user?.isVerified
                ? null
                : (response.data.user?.email ?? null);

            set({
                user: response.data.user,
                verificationEmail,
                isAuthenticated: true,
                isCheckingAuth: false,
            });
            setStoredVerificationEmail(verificationEmail);
        } catch (error) {
            const status = (error as { response?: { status?: number } })?.response
                ?.status;

            if (status === 401 || status === 403) {
                set({
                    error: null,
                    isCheckingAuth: false,
                    isAuthenticated: false,
                    user: null,
                    verificationEmail: getStoredVerificationEmail(),
                });
            } else {
                set({ isCheckingAuth: false });
            }
        } finally {
            isVerifyingAuth = false;
        }
    },
}));

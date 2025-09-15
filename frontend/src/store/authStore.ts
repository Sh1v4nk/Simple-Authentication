import { create } from "zustand";
import axios from "@/utils/axiosConfig";
import { AuthState } from "@/types";
import { handleError } from "@/utils/handelErrors";

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });

    failedQueue = [];
};

axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Check if error is 401 and we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            console.log("🔑 401 error detected, attempting token refresh");

            if (isRefreshing) {
                console.log("⏳ Already refreshing, queuing request");
                // If already refreshing, queue the request
                return new Promise((resolve, reject) => {
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
                console.log("🔄 Starting token refresh...");
                await axios.post("/refresh");

                console.log("✅ Token refresh successful");
                processQueue(null, "success");
                return axios(originalRequest);
            } catch (refreshError) {
                console.log(
                    "❌ Token refresh failed:",
                    refreshError instanceof Error
                        ? refreshError.message
                        : refreshError,
                );
                processQueue(refreshError, null);

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
                isAuthenticated: true,
                isLoading: false,
                message: response.data.message,
                generalErrors: [],
            });
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
                isAuthenticated: true,
                isLoading: false,
                message: response.data.message,
                generalErrors: [],
            });
        } catch (error) {
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
        } catch (error) {
            // Always clear auth state even if signout request fails
            set({
                user: null,
                isAuthenticated: false,
                error: null,
                isLoading: false,
            });
            handleError(error, set);
        }
    },

    logoutAllDevices: async () => {
        set({ isLoading: true, error: null });
        try {
            await axios.post("/revoke-all");
            set({
                user: null,
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
        } catch (error) {
            // Even if revoke-all fails, clear local state
            set({
                user: null,
                isAuthenticated: false,
                error: null,
                isLoading: false,
            });
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
                isAuthenticated: false,
                error: null,
                isLoading: false,
                isCheckingAuth: false,
            });
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
                isAuthenticated: true,
                isLoading: false,
                message: response.data.message,
                generalErrors: [],
            });
            return response.data;
        } catch (error) {
            set({ isLoading: false });
            handleError(error, set);
        }
    },

    resendOTP: async () => {
        set({ error: null });
        try {
            const response = await axios.post("/resend-otp");
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
        console.log("🔍 Starting auth verification...");
        set({ isCheckingAuth: true, error: null });

        try {
            const response = await axios.get("/verify-auth");
            console.log("✅ Auth verification successful");
            set({
                user: response.data.user,
                isAuthenticated: true,
                isCheckingAuth: false,
            });
        } catch (error) {
            console.log(
                "❌ Auth verification failed:",
                error instanceof Error ? error.message : error,
            );
            set({
                error: null,
                isCheckingAuth: false,
                isAuthenticated: false,
                user: null,
            });
        }
    },
}));

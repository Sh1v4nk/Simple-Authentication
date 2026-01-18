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
                const refreshResponse = await axios.post("/refresh");

                if (refreshResponse.status === 200) {
                    processQueue(null, "success");

                    // Always retry the request after successful refresh
                    return axios(originalRequest);
                } else {
                    throw new Error(
                        `Refresh failed with status: ${refreshResponse.status}`,
                    );
                }
            } catch (refreshError) {
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
        // Prevent multiple simultaneous verification attempts
        if (isVerifyingAuth) {
            return;
        }

        set({ isCheckingAuth: true, error: null });
        isVerifyingAuth = true;

        try {
            const response = await axios.get("/verify-auth");
            set({
                user: response.data.user,
                isAuthenticated: true,
                isCheckingAuth: false,
            });
        } catch (error) {
            // Check if this is a 401 that should trigger refresh
            const axiosError = error as any;
            if (axiosError?.response?.status === 401) {


                // The interceptor should have handled the refresh automatically
                // If we get here, it means refresh failed, so logout is appropriate

            } else {

            }



            // Only set to unauthenticated if we're sure it's not a temporary network issue
            set({
                error: null,
                isCheckingAuth: false,
                isAuthenticated: false,
                user: null,
            });
        } finally {
            isVerifyingAuth = false;
        }
    },
}));

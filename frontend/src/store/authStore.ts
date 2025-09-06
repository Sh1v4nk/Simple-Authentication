import { create } from "zustand";
import axios from "axios";
import { AuthState } from "@/types";
import { handleError } from "@/utils/handelErrors";

const API_URL =
    import.meta.env.MODE === "development"
        ? "http://localhost:3000/api/auth"
        : import.meta.env.VITE_SERVER_URL || "/api/auth";

axios.defaults.withCredentials = true;

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
                await axios.post(`${API_URL}/refresh`);
                processQueue(null, "success");
                return axios(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);

                // Refresh failed, redirect to login
                const { signout } = useAuthStore.getState();
                signout();

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
            const response = await axios.post(`${API_URL}/signin`, {
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
            handleError(error, set);
        }
    },

    signout: async () => {
        set({ isLoading: true, error: null });
        try {
            await axios.post(`${API_URL}/signout`);
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
            await axios.post(`${API_URL}/revoke-all`);
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
            const response = await axios.post(`${API_URL}/refresh`);
            return response.data;
        } catch (error) {
            const { signout } = get();
            signout();
            throw error;
        }
    },

    verifyEmail: async (emailCode) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axios.post(`${API_URL}/verify-email`, {
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
            handleError(error, set);
        }
    },

    resendOTP: async () => {
        set({ error: null });
        try {
            const response = await axios.post(`${API_URL}/resend-otp`);
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
            const response = await axios.post(`${API_URL}/forgot-password`, {
                email,
            });
            set({ isLoading: false, message: response.data.message });
        } catch (error) {
            handleError(error, set);
        }
    },

    resetPassword: async (token, password) => {
        set({ isLoading: true, error: null, passwordError: null });
        try {
            const response = await axios.post(`${API_URL}/reset-password/${token}`, {
                password,
            });
            set({
                isLoading: false,
                message: response.data.message,
                generalErrors: [],
                tokenError: [],
            });
        } catch (error) {
            handleError(error, set);
        }
    },

    verifyAuth: async () => {
        set({ isCheckingAuth: true, error: null });
        try {
            const response = await axios.get(`${API_URL}/verify-auth`);
            set({
                user: response.data.user,
                isAuthenticated: true,
                isCheckingAuth: false,
            });
        } catch (error) {
            set({
                error: null,
                isCheckingAuth: false,
                isAuthenticated: false,
                user: null,
            });
        }
    },
}));

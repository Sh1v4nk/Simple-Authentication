import { create } from "zustand";
import axios from "@/utils/axiosConfig";
import { AuthState } from "@/types";
import { handleError } from "@/utils/handelErrors";

const API_URL =
    import.meta.env.MODE === "development"
        ? "http://localhost:3000/api/auth"
        : import.meta.env.VITE_SERVER_URL || "/api/auth";

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
    rateLimited: false,
    rateLimitRetryAfter: 0,
    accountLocked: false,
    lockedUntil: undefined,

    signup: async (email, password, username) => {
        set({
            isLoading: true,
            error: null,
            message: null,
            emailError: null,
            passwordError: null,
            usernameError: null,
            generalErrors: [],
            rateLimited: false,
            rateLimitRetryAfter: 0,
            accountLocked: false,
            lockedUntil: undefined,
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
            rateLimited: false,
            rateLimitRetryAfter: 0,
            accountLocked: false,
            lockedUntil: undefined,
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
            });
        } catch (error) {
            handleError(error, set);
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

        // Quick check: if there's no auth storage, skip the network request
        const authStorage = localStorage.getItem("auth-storage");
        if (!authStorage) {
            set({
                error: null,
                isCheckingAuth: false,
                isAuthenticated: false,
                user: null,
            });
            return;
        }

        try {
            const response = await axios.get(`${API_URL}/verify-auth`);
            set({
                user: response.data.user,
                isAuthenticated: true,
                isCheckingAuth: false,
            });
        } catch (error: any) {
            // Don't log errors for verify-auth as 401 is expected when not logged in
            set({
                error: null,
                isCheckingAuth: false,
                isAuthenticated: false,
                user: null,
            });
        }
    },

    revokeAllTokens: async () => {
        set({ isLoading: true, error: null });
        try {
            await axios.post(`${API_URL}/revoke-all`);
            set({
                user: null,
                isAuthenticated: false,
                error: null,
                isLoading: false,
                message: "All devices logged out successfully",
            });
        } catch (error) {
            handleError(error, set);
        }
    },
}));

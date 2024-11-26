import { create } from "zustand";
import axios from "axios";
import { AuthState } from "@/types";
import { handleError } from "@/utils/handelErrors";

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

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null, emailError: null, message: null });
    try {
      const response = await axios.post(`${API_URL}/forgot-password`, { email });
      set({ isLoading: false, message: response.data.message });
    } catch (error) {
      handleError(error, set);
    }
  },

  resetPassword: async (token, password) => {
    set({ isLoading: true, error: null, passwordError: null, });
    try {
      const response = await axios.post(`${API_URL}/reset-password/${token}`, {
        password,
      });
      set({ isLoading: false, message: response.data.message, generalErrors: [], tokenError: [] });
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

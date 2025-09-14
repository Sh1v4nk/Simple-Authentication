import axios from "axios";

export const API_URL =
    import.meta.env.MODE === "development"
        ? "http://localhost:3000/api/auth"
        : import.meta.env.VITE_SERVER_URL || "/api/auth";

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.baseURL = API_URL;

// Add request interceptor for consistent base URL
axios.interceptors.request.use((config) => {
    // Ensure all requests use the correct base URL
    if (!config.url?.startsWith("http")) {
        config.baseURL = API_URL;
    }
    return config;
});

export default axios;

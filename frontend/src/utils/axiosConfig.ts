import axios from "axios";

const API_URL =
    import.meta.env.MODE === "development"
        ? "http://localhost:3000/api/auth"
        : import.meta.env.VITE_SERVER_URL || "/api/auth";

// Set default configuration
axios.defaults.withCredentials = true;

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}> = [];

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

// Function to clear auth state and redirect
const clearAuthAndRedirect = () => {
    // Clear any stored auth state
    localStorage.removeItem("auth-storage");
    sessionStorage.clear();

    // Redirect to login
    if (window.location.pathname !== "/signin") {
        window.location.href = "/signin";
    }
};

// Response interceptor for automatic token refresh
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Don't intercept verify-auth or refresh endpoints to avoid infinite loops
        if (
            originalRequest.url?.includes("/verify-auth") ||
            originalRequest.url?.includes("/refresh")
        ) {
            return Promise.reject(error);
        }

        // Check if it's a 401 error and we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, queue this request
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
                // Attempt to refresh the token
                const response = await axios.post(`${API_URL}/refresh`);

                if (response.status === 200) {
                    processQueue(null, response.data.accessToken);

                    // Retry the original request
                    return axios(originalRequest);
                } else {
                    throw new Error("Token refresh failed");
                }
            } catch (refreshError) {
                // Refresh failed - tokens are likely revoked or expired
                processQueue(refreshError, null);

                console.warn("Token refresh failed - tokens may have been revoked");
                clearAuthAndRedirect();

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

export default axios;

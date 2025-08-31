import { Navigate } from "react-router-dom";
import { RouteGuardProps } from "@/types";
import { useAuthStore } from "@/store/authStore";

export const ProtectedRoute = ({ children }: RouteGuardProps) => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/signin" replace />;
    }

    if (user && !user.isVerified) {
        return <Navigate to="/verify-email" replace />;
    }

    return children;
};

export const RedirectIfAuthenticated = ({ children }: RouteGuardProps) => {
    const { isAuthenticated, user } = useAuthStore();

    if (isAuthenticated && user?.isVerified) {
        return <Navigate to="/" replace />;
    }

    return children;
};

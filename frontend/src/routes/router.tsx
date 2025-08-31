import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
} from "react-router-dom";

import {
    DashboardPage,
    SignUpPage,
    SignInPage,
    VerifyEmailPage,
    ForgotPasswordPage,
    ResetPasswordPage,
} from "@/pages";
import { ProtectedRoute, RedirectIfAuthenticated } from "@/routes/routeGuards";

export const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/signup"
                element={
                    <RedirectIfAuthenticated>
                        <SignUpPage />
                    </RedirectIfAuthenticated>
                }
            />
            <Route
                path="/signin"
                element={
                    <RedirectIfAuthenticated>
                        <SignInPage />
                    </RedirectIfAuthenticated>
                }
            />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route
                path="/forgot-password"
                element={
                    <RedirectIfAuthenticated>
                        <ForgotPasswordPage />
                    </RedirectIfAuthenticated>
                }
            />
            <Route
                path="/reset-password/:token"
                element={
                    <RedirectIfAuthenticated>
                        <ResetPasswordPage />
                    </RedirectIfAuthenticated>
                }
            />
        </>,
    ),
);

import { useEffect } from "react";
import { Toaster } from "sonner";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  Navigate,
} from "react-router-dom";

import {
  DashboardPage,
  SignUpPage,
  SignInPage,
  VerifyEmailPage,
  ForgotPasswordPage,
} from "@/pages";
import FloatingShape from "@/components/FloatingShape";
import { useAuthStore } from "@/store/authStore";

function App() {
  const { verifyAuth, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  const RedirectIfAuthenticated = ({ children }: { children: React.ReactNode }) => {
    if (isAuthenticated && user?.isVerified) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/signin" replace />;
    }

    if (!user?.isVerified) {
      return <Navigate to="/verify-email" replace />;
    }

    return children;
  };

  const router = createBrowserRouter(
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
        <Route
          path="/verify-email"
          element={
            <ProtectedRoute>
              <VerifyEmailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </>,
    ),
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <Toaster theme="dark" />
      <FloatingShape
        color="bg-gray-500"
        size="w-32 h-32 md:w-64 md:h-64"
        top="-5%"
        left="10%"
        delay={0}
      />
      <FloatingShape
        color="bg-gray-500"
        size="w-20 h-20 md:w-64 md:h-64"
        top="-10%"
        left="70%"
        delay={2}
      />

      <FloatingShape
        color="bg-gray-500"
        size="w-16 w-16 md:w-32 md:h-32"
        top="40%"
        left="-5%"
        delay={2}
      />
      <FloatingShape
        color="bg-gray-500"
        size="w-20 h-20 md:w-40 md:h-40"
        top="75%"
        left="30%"
        delay={4}
      />
      <FloatingShape
        color="bg-gray-500"
        size="w-24 h-24 md:w-48 md:h-48"
        top="70%"
        left="80%"
        delay={5}
      />

      <RouterProvider router={router} />
    </div>
  );
}

export default App;

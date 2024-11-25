import { useEffect } from "react";
import { Toaster } from "sonner";
import { RouterProvider } from "react-router-dom";

import { router } from "@/routes/router";
import FloatingShape from "@/components/FloatingShape";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuthStore } from "@/store/authStore";

function App() {
  const { verifyAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

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

      {isCheckingAuth ? <LoadingSpinner /> : <RouterProvider router={router} />}
    </div>
  );
}

export default App;

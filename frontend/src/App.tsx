import { useEffect } from "react";
import { Toaster } from "sonner";
import { RouterProvider } from "react-router-dom";

import { router } from "@/routes/router";
import FloatingShape from "@/components/FloatingShape";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuthStore } from "@/store/authStore";
import { floatingShapeConfig } from "@/utils/floatingShapeConfig";

function App() {
  const { verifyAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <Toaster theme="dark" />

      {floatingShapeConfig.map((shape, index) => (
        <FloatingShape
          key={index}
          color={shape.color}
          size={shape.size}
          top={shape.top}
          left={shape.left}
          delay={shape.delay}
        />
      ))}

      {isCheckingAuth ? <LoadingSpinner /> : <RouterProvider router={router} />}
    </div>
  );
}

export default App;

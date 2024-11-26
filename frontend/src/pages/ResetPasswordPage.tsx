import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  PasswordInput,
  Button,
} from "@/components/ui";
import { useAuthStore } from "@/store/authStore";

function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordMatchError, setPasswordMatchError] = useState<boolean>(false);
  const { resetPassword, isLoading, generalErrors, passwordError, tokenError } =
    useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMatchError(false);

    if (!token) return;
    if (password !== confirmPassword) {
      setPasswordMatchError(true);
      return;
    }

    await resetPassword(token, password);
    toast.success("Password reset successful.", {
      description: "Redirecting in 3 seconds",
      cancel: {
        label: "Close",
        onClick: () => {
          toast.dismiss();
        },
      },
    });
    setTimeout(() => {
      navigate("/signin");
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="m-4 w-full max-w-lg animate-border rounded-xl border border-transparent shadow-xl backdrop-blur-xl backdrop-filter [background:conic-gradient(from_var(--border-angle),theme(colors.slate.600/.48)_80%,theme(colors.purple.500)_86%,theme(colors.purple.300)_90%,theme(colors.purple.500)_94%,theme(colors.slate.600/.48))_border-box]"
    >
      <Card className="border-transparent bg-black font-poppins">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold text-white">
            Reset Password
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Enter new password to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <div className="relative">
                  <PasswordInput
                    id="password"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <div className="relative">
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500"
                  />
                </div>
                {passwordMatchError && (
                  <p className="text-sm text-red-500">Passwords do not match</p>
                )}
                {tokenError && (
                  <p className="text-sm text-red-500">{tokenError[0]}</p>
                )}
                {passwordError && passwordError.length > 0
                  ? passwordError.map((error, index) => (
                      <p key={index} className="text-sm text-red-500">
                        {error}
                      </p>
                    ))
                  : generalErrors?.map((error, index) => (
                      <p key={index} className="text-sm text-red-500">
                        {error}
                      </p>
                    ))}
              </div>
              <Button
                type="submit"
                className={`w-full bg-purple-500 transition-colors hover:bg-purple-600 ${
                  isLoading ? "pointer-events-none opacity-50" : ""
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
                    Reseting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ResetPasswordPage;

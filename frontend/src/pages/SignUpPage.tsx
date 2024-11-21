import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Loader2 } from "lucide-react";

import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  PasswordInput,
} from "@/components/ui";

import PasswordStrengthChecker from "@/components/PasswordStrengthChecker";
import { useAuthStore } from "@/store/authStore";

function SignUpPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const {
    signup,
    isLoading,
    emailError,
    passwordError,
    usernameError,
    generalErrors,
  } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup(email, password, username);
      navigate("/verify-email");
    } catch (error) {
      console.error("Signup error:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="m-4 w-full max-w-lg animate-border rounded-xl border border-transparent shadow-xl backdrop-blur-xl backdrop-filter [background:conic-gradient(from_var(--border-angle),theme(colors.slate.600/.48)_80%,theme(colors.purple.500)_86%,theme(colors.purple.300)_90%,theme(colors.purple.500)_94%,theme(colors.slate.600/.48))_border-box]"
    >
      <Card className="border-transparent bg-black font-poppins">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-white">
              Create Account
            </CardTitle>
            <CardDescription className="text-center text-zinc-400">
              Sign up for a new account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Username Input */}
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <Input
                  className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500"
                  placeholder="User Name"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              {usernameError && (
                <p className="text-sm text-red-500">{usernameError}</p>
              )}
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <Input
                  className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500"
                  placeholder="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {emailError && (
                <p className="text-sm text-red-500">{emailError}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="relative">
                <PasswordInput
                  className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {generalErrors?.map((error: string, index: number) => (
                <p key={index} className="text-sm text-red-500">
                  {error}
                </p> // This will render each error on a new line
              ))}

              {passwordError?.map((error: string, index: number) => (
                <p key={index} className="text-sm text-red-500">
                  {error}
                </p> // This will render each error on a new line
              ))}

              {/* Password Strength Checker */}
              <PasswordStrengthChecker password={password} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            {/* Submit Button */}
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
                  Signing Up...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>

            {/* Link to Sign In */}
            <div className="text-center text-sm text-zinc-400">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="text-purple-400 transition-colors hover:text-purple-300"
              >
                Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}

export default SignUpPage;

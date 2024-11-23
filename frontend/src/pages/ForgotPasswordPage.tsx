import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";

import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="m-4 w-full max-w-lg animate-border rounded-xl border border-transparent shadow-xl backdrop-blur-xl backdrop-filter [background:conic-gradient(from_var(--border-angle),theme(colors.slate.600/.48)_80%,theme(colors.purple.500)_86%,theme(colors.purple.300)_90%,theme(colors.purple.500)_94%,theme(colors.slate.600/.48))_border-box]"
    >
      <Card className="border-transparent bg-black font-poppins">
        <CardHeader className="mb-2 text-center">
          <CardTitle className="text-2xl font-semibold text-white">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your email address to reset your passsword.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className={`w-full rounded-lg bg-purple-500 py-2 font-medium text-white transition-colors hover:bg-purple-600`}
              >
                Send Reset Link
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            <Link
              to="/signin"
              className="flex items-center justify-center text-center text-purple-400 transition-colors hover:text-purple-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ForgotPasswordPage;

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
  Input,
  Label,
  PasswordInput,
} from "@/components/ui";

function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt with:", email, password);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-lg w-full backdrop-filter backdrop-blur-xl shadow-xl m-4
      // animation
      [background:conic-gradient(from_var(--border-angle),theme(colors.slate.600/.48)_80%,theme(colors.purple.500)_86%,theme(colors.purple.300)_90%,theme(colors.purple.500)_94%,theme(colors.slate.600/.48))_border-box] rounded-xl border border-transparent animate-border
      "
    >
      <Card className="bg-black border-transparent font-poppins">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-white">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Enter your email to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-white">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-white">
                  Password
                </Label>
                <div className="relative">
                  <PasswordInput
                    id="password"
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-500 hover:bg-purple-600 transition-colors"
              >
                Sign In
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            <Link
              to="/forgot-password"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-zinc-400">Don't have an account?</div>
          <Button variant="outline" size="sm">
            <Link to="/signup">Create account</Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default SignInPage;

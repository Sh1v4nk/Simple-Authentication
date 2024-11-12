import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { User, Mail } from "lucide-react";

import {
  Button,
  Input,
  Progress,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  PasswordInput,
} from "@/components/ui";

function SignUpPage() {
  const [password, setPassword] = useState("");

  const requirements = [
    { text: "At least 8 characters", regex: /.{8,}/ },
    { text: "Contains uppercase letter", regex: /[A-Z]/ },
    { text: "Contains lowercase letter", regex: /[a-z]/ },
    { text: "Contains a number", regex: /[0-9]/ },
    { text: "Contains special character", regex: /[^A-Za-z0-9]/ },
  ];

  const getPasswordStrength = () => {
    return requirements.filter((req) => req.regex.test(password)).length * 20;
  };

  const getStrengthText = (strength: number) => {
    if (strength === 0) return "Worst";
    if (strength <= 20) return "Weak";
    if (strength <= 40) return "Fair";
    if (strength <= 60) return "Good";
    if (strength <= 80) return "Strong";
    return "Very Strong";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="m-4 w-full max-w-lg animate-border rounded-xl border border-transparent shadow-xl backdrop-blur-xl backdrop-filter [background:conic-gradient(from_var(--border-angle),theme(colors.slate.600/.48)_80%,theme(colors.purple.500)_86%,theme(colors.purple.300)_90%,theme(colors.purple.500)_94%,theme(colors.slate.600/.48))_border-box]"
    >
      <Card className="border-transparent bg-black font-poppins">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-white">
            Create Account
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Sign up for a new account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <Input
                className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500"
                placeholder="User Name"
                type="text"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <Input
                className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500"
                placeholder="Email Address"
                type="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <PasswordInput
                className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Password strength</span>
                <span
                  className={` ${getPasswordStrength() <= 20 ? "text-red-500" : ""} ${
                    getPasswordStrength() > 20 && getPasswordStrength() <= 60
                      ? "text-yellow-500"
                      : ""
                  } ${getPasswordStrength() > 60 ? "text-emerald-500" : ""} `}
                >
                  {getStrengthText(getPasswordStrength())}
                </span>
              </div>
              <Progress
                value={getPasswordStrength()}
                className="h-2 bg-zinc-700 [&>div]:bg-purple-500"
              />
            </div>

            <div className="space-y-2">
              {requirements.map((req, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-zinc-400"
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      req.regex.test(password)
                        ? "bg-emerald-500"
                        : "bg-zinc-700"
                    }`}
                  />
                  {req.text}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button className="w-full bg-purple-500 transition-colors hover:bg-purple-600">
            Sign Up
          </Button>
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
      </Card>
    </motion.div>
  );
}

export default SignUpPage;

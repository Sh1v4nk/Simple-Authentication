import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

import {
    Button,
    Input,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { formatDate } from "@/utils/dateUtils";

function ForgotPasswordPage() {
    const [email, setEmail] = useState<string>("");
    const {
        forgotPassword,
        isLoading,
        emailError,
        message,
        rateLimited,
        rateLimitRetryAfter,
        accountLocked,
    } = useAuthStore();

    // Calculate if form should be disabled
    const isFormDisabled = isLoading || rateLimited || accountLocked;
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await forgotPassword(email);
        toast.success("Password Reset Link Sent", {
            description: formatDate(),
            cancel: {
                label: "Close",
                onClick: () => {
                    toast.dismiss();
                },
            },
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
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
                        {!message
                            ? "Enter your email address to reset your password."
                            : "Check your inbox for the password reset link."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!message ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Email Address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="border-zinc-700 bg-zinc-800 pl-10 text-white placeholder:text-zinc-500"
                                        disabled={isFormDisabled}
                                        required
                                    />
                                </div>
                                {emailError && (
                                    <p className="text-sm text-red-500">
                                        {emailError}
                                    </p>
                                )}
                            </div>
                            <Button
                                type="submit"
                                className={`w-full rounded-lg bg-purple-500 py-2 font-medium transition-colors hover:bg-purple-600 ${
                                    isFormDisabled
                                        ? "pointer-events-none opacity-50"
                                        : ""
                                }`}
                                disabled={isFormDisabled}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
                                        Sending Reset Link..
                                    </>
                                ) : rateLimited ? (
                                    `Rate Limited - Try again in ${Math.ceil((rateLimitRetryAfter || 3600) / 60)} min`
                                ) : accountLocked ? (
                                    `Account Locked - Try again later`
                                ) : (
                                    "Send Reset Link"
                                )}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-6 text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                }}
                                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-500"
                            >
                                <CheckCircle className="h-8 w-8 text-white" />
                            </motion.div>
                            <p className="text-zinc-400">
                                If an account exists for{" "}
                                <span className="font-semibold text-white">
                                    {email}
                                </span>
                                , you will receive a password reset link shortly.
                            </p>
                        </div>
                    )}
                    <div className="mt-4 text-center text-sm">
                        <Link
                            to="/signin"
                            className="flex items-center justify-center text-center text-purple-400 transition-colors hover:text-purple-300"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default ForgotPasswordPage;

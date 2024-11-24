import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

function EmailVerifyPage() {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { verifyEmail, isLoading, generalErrors } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (index: number, value: string) => {
    // Allow only digits and limit to a single character per input
    if (/^\d?$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      // Move to the next input if value is entered
      if (value !== "" && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && index > 0 && code[index] === "") {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting of the OTP code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const paste = e.clipboardData
      .getData("Text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newCode = paste.split("");

    setCode((prevCode) => {
      const updatedCode = [...prevCode];
      newCode.forEach((digit, index) => {
        if (index < updatedCode.length) {
          updatedCode[index] = digit;
        }
      });
      return updatedCode;
    });

    const nextEmptyBox = Math.min(paste.length, 5);
    if (paste.length === 6) {
      (e.target as HTMLInputElement).blur();
    } else {
      inputRefs.current[nextEmptyBox]?.focus();
    }
  };

  const submitOTP = async (): Promise<void> => {
    const verificationCode = code.join("");
    try {
      await verifyEmail(verificationCode);
      toast.success("Email verification successful", {
        cancel: {
          label: "Close",
          onClick: () => {
            toast.dismiss();
          },
        },
      });
      navigate("/");
    } catch (error) {
      console.error("Email Verification error:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitOTP();
  };

  // Auto submit when all OTP fields are filled
  useEffect(() => {
    if (code.every((digit) => digit !== "")) {
      submitOTP();
      inputRefs.current.forEach((input) => input?.blur());
    }
  }, [code]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="m-4 w-full max-w-lg animate-border rounded-xl border border-transparent shadow-xl backdrop-blur-xl backdrop-filter [background:conic-gradient(from_var(--border-angle),theme(colors.slate.600/.48)_80%,theme(colors.purple.500)_86%,theme(colors.purple.300)_90%,theme(colors.purple.500)_94%,theme(colors.slate.600/.48))_border-box]"
    >
      <Card className="border-transparent bg-black font-poppins">
        <CardHeader className="mb-4 text-center">
          <CardTitle className="text-2xl font-semibold text-white">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Enter the 6-digit code sent to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="mb-8 flex justify-center gap-4">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  ref={(el) => (inputRefs.current[index] = el)}
                  className="h-12 w-12 rounded-md border-zinc-700 bg-zinc-800 text-center text-lg font-semibold text-white focus:border-purple-500 focus:ring-purple-500/20"
                />
              ))}
            </div>
            {generalErrors?.map((error, index) => (
              <p
                key={index}
                className="-mt-4 mb-4 text-center text-sm text-red-500"
              >
                {error}
              </p>
            ))}
            <Button
              type="submit"
              className={`w-full rounded-lg bg-purple-500 py-2 font-medium text-white transition-colors hover:bg-purple-600 ${
                isLoading ? "pointer-events-none opacity-50" : ""
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
                  Verifying Email...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default EmailVerifyPage;

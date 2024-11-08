import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui";

function EmailVerifyPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    e: React.KeyboardEvent<HTMLInputElement>
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

    const paste = e.clipboardData.getData("Text").slice(0, 6);
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

    const nextEmptyBox = paste.length;
    if (nextEmptyBox === 6) {
      inputRefs.current[5]?.focus();
    } else {
      inputRefs.current[nextEmptyBox]?.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-lg w-full backdrop-filter backdrop-blur-xl shadow-xl m-4
      [background:conic-gradient(from_var(--border-angle),theme(colors.slate.600/.48)_80%,theme(colors.purple.500)_86%,theme(colors.purple.300)_90%,theme(colors.purple.500)_94%,theme(colors.slate.600/.48))_border-box] rounded-xl border border-transparent animate-border
      "
    >
      <Card className="bg-black border-transparent font-poppins">
        <CardHeader className="text-center mb-4">
          <CardTitle className="text-2xl font-semibold text-white">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Enter the 6-digit code sent to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center gap-4 mb-8">
            {code.map((digit, index) => (
              <Input
                key={index}
                type="text" // Using type="text" to allow custom handling of input validation
                maxLength={1} // Max 1 character per field
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                ref={(el) => (inputRefs.current[index] = el)}
                className="w-12 h-12 text-center text-lg font-semibold bg-zinc-800 border-zinc-700 text-white
                           focus:border-purple-500 focus:ring-purple-500/20 rounded-md"
              />
            ))}
          </div>
          <Button
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 rounded-lg transition-colors"
            onClick={() => console.log("Verification code:", code.join(""))}
          >
            Verify Email
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default EmailVerifyPage;

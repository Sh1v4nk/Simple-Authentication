import { Progress } from "@/components/ui";

// Define the password requirements
const requirements = [
  { text: "At least 8 characters", regex: /.{8,}/ },
  { text: "Contains uppercase letter", regex: /[A-Z]/ },
  { text: "Contains lowercase letter", regex: /[a-z]/ },
  { text: "Contains a number", regex: /[0-9]/ },
  { text: "Contains special character", regex: /[^A-Za-z0-9]/ },
];

// Get the password strength
const getPasswordStrength = (password: string) => {
  return requirements.filter((req) => req.regex.test(password)).length * 20;
};

// Get the strength text based on the strength value
const getStrengthText = (strength: number) => {
  if (strength === 0) return "Worst";
  if (strength <= 20) return "Weak";
  if (strength <= 40) return "Fair";
  if (strength <= 60) return "Good";
  if (strength <= 80) return "Strong";
  return "Very Strong";
};

const PasswordStrengthChecker = ({ password }: { password: string }) => {
  const strength = getPasswordStrength(password);
  const strengthText = getStrengthText(strength);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">Password strength</span>
        <span
          className={`${
            strength <= 20 ? "text-red-500" : ""
          } ${strength > 20 && strength <= 60 ? "text-yellow-500" : ""} ${
            strength > 60 ? "text-emerald-500" : ""
          }`}
        >
          {strengthText}
        </span>
      </div>
      <Progress
        value={strength}
        className="h-2 bg-zinc-700 [&>div]:bg-purple-500"
      />
      <div className="space-y-2">
        {requirements.map((req, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-sm text-zinc-400"
          >
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                req.regex.test(password) ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            />
            {req.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthChecker;

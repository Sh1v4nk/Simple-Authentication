import crypto from "crypto";

export function generateResetPasswordToken(): string {
  return crypto.randomBytes(20).toString("hex");
}

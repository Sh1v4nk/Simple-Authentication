import crypto from "crypto";

export function generateEmailVerificationToken(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

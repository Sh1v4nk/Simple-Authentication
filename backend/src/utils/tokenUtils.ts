import crypto from "crypto";

export function generateToken(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

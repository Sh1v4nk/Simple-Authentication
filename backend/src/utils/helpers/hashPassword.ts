import bcrypt from "bcrypt";
import { SECURITY_CONSTANTS } from "@/constants";

/**
 * Hashes a plain-text password using bcrypt.
 *
 * @param password - The plain-text password to hash.
 * @returns A promise that resolves to the hashed password.
 */

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SECURITY_CONSTANTS.SALT_ROUNDS);
};

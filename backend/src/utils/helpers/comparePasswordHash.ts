import bcrypt from "bcrypt";

/**
 * Compares a plain-text password with a hashed password.
 *
 * @param password - The plain-text password to compare.
 * @param hashedPassword - The hashed password stored in the database.
 * @returns A promise that resolves to `true` if the passwords match, or `false` if they do not.
 */

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

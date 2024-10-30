import { z } from "zod";

const emailValidation = z.string().email({ message: "Invalid email address" });

const passwordValidation = z
  .string()
  .min(6, { message: "Password must be at least 6 characters long" })
  .max(32, { message: "Password must be at most 32 characters long" });

export const signUpValidation = z.object({
  email: emailValidation,
  password: passwordValidation,
  username: z
    .string()
    .min(1, { message: "Username is required" })
    .max(20, { message: "Username must be at most 20 characters" }),
});

export const signInValidation = z.object({
  email: emailValidation,
  password: passwordValidation,
});

export const forgotPasswordValidation = z.object({
  email: emailValidation,
});

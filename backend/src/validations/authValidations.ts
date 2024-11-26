import { z } from "zod";

const emailValidation = z.string().email({ message: "Invalid email address" });

const passwordValidation = z
  .string()
  .min(8, { message: "Password must be at least 8 characters long" })
  .max(40, { message: "Password must be at most 40 characters long" })
  .refine((password) => /[A-Z]/.test(password), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((password) => /[a-z]/.test(password), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((password) => /[0-9]/.test(password), {
    message: "Password must contain at least one number",
  })
  .refine((password) => /[^A-Za-z0-9]/.test(password), {
    message: "Password must contain at least one special character",
  });

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

export const emailCodeValidation = z.object({
  emailCode: z.string().length(6, {
    message: "Verification code must be exactly 6 characters long",
  }),
});

export const forgotPasswordValidation = z.object({
  email: emailValidation,
});

export const resetPasswordValidation = z.object({
  token: z
    .string()
    .length(40, { message: "Token must be exactly 40 characters long" }),
  password: passwordValidation,
});

import { z } from "zod";

export const signupValidation = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(1),
});

export const signinValidation = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

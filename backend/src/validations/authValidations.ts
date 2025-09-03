import { z } from "zod";
import { VALIDATION_MESSAGES } from "@/constants/enums";

export const emailSchema = z.string().email({ message: VALIDATION_MESSAGES.EMAIL_INVALID });

export const passwordSchema = z
    .string()
    .min(8, { message: VALIDATION_MESSAGES.PASSWORD_MIN })
    .max(40, { message: VALIDATION_MESSAGES.PASSWORD_MAX })
    .refine((password) => /[A-Z]/.test(password), {
        message: VALIDATION_MESSAGES.PASSWORD_UPPERCASE,
    })
    .refine((password) => /[a-z]/.test(password), {
        message: VALIDATION_MESSAGES.PASSWORD_LOWERCASE,
    })
    .refine((password) => /[0-9]/.test(password), {
        message: VALIDATION_MESSAGES.PASSWORD_NUMBER,
    })
    .refine((password) => /[^A-Za-z0-9]/.test(password), {
        message: VALIDATION_MESSAGES.PASSWORD_SPECIAL_CHAR,
    });

export const usernameSchema = z
    .string()
    .min(2, { message: VALIDATION_MESSAGES.USERNAME_REQUIRED })
    .max(20, { message: VALIDATION_MESSAGES.USERNAME_MAX });

export const tokenSchema = z.string().length(40, { message: VALIDATION_MESSAGES.RESET_TOKEN_LENGTH });

export const signUpValidationSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    username: usernameSchema,
});

export const signInValidationSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

export const emailCodeValidationSchema = z.object({
    emailCode: z.string().length(6, {
        message: VALIDATION_MESSAGES.EMAIL_CODE_LENGTH,
    }),
});

export const forgotPasswordValidationSchema = z.object({
    email: emailSchema,
});

export const resetPasswordValidationSchema = z.object({
    token: tokenSchema,
    password: passwordSchema,
});

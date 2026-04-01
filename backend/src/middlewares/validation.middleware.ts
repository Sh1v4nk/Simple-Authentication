import type { Request, Response, NextFunction } from "express";
import { sendErrorResponse } from "@/utils/response";
import { ERROR_MESSAGES, HTTP_STATUS } from "@/constants/enums";
import {
    signUpValidationSchema,
    signInValidationSchema,
    emailCodeValidationSchema,
    forgotPasswordValidationSchema,
    resetPasswordValidationSchema,
} from "@/validations/auth.validation";

const formatZodErrors = (errors: { path: (string | number)[]; message: string }[]): string[] =>
    errors.map((e) => (e.path.length > 0 ? `${e.path.join(".")}: ${e.message}` : e.message));

export const validateSignUp = (req: Request, res: Response, next: NextFunction): void => {
    const result = signUpValidationSchema.safeParse(req.body);
    if (!result.success) {
        sendErrorResponse(res, ERROR_MESSAGES.INCORRECT_FORMAT, HTTP_STATUS.BAD_REQUEST, {
            errors: formatZodErrors(result.error.errors),
        });
        return;
    }
    req.body = result.data;
    next();
};

export const validateSignIn = (req: Request, res: Response, next: NextFunction): void => {
    const result = signInValidationSchema.safeParse(req.body);
    if (!result.success) {
        sendErrorResponse(res, ERROR_MESSAGES.INCORRECT_FORMAT, HTTP_STATUS.BAD_REQUEST, {
            errors: formatZodErrors(result.error.errors),
        });
        return;
    }
    req.body = result.data;
    next();
};

export const validateEmailCode = (req: Request, res: Response, next: NextFunction): void => {
    const result = emailCodeValidationSchema.safeParse(req.body);
    if (!result.success) {
        sendErrorResponse(res, ERROR_MESSAGES.INVALID_VERIFICATION_CODE, HTTP_STATUS.BAD_REQUEST, {
            errors: formatZodErrors(result.error.errors),
        });
        return;
    }
    req.body = result.data;
    next();
};

export const validateForgotPassword = (req: Request, res: Response, next: NextFunction): void => {
    const result = forgotPasswordValidationSchema.safeParse(req.body);
    if (!result.success) {
        sendErrorResponse(res, ERROR_MESSAGES.INCORRECT_FORMAT, HTTP_STATUS.BAD_REQUEST, {
            errors: formatZodErrors(result.error.errors),
        });
        return;
    }
    req.body = result.data;
    next();
};

export const validateResetPassword = (req: Request, res: Response, next: NextFunction): void => {
    // Token from URL param (/reset-password/:token), password from body.
    // Merged into req.body so controller reads one place consistently.
    const result = resetPasswordValidationSchema.safeParse({
        token: req.params.token,
        password: req.body.password,
    });
    if (!result.success) {
        sendErrorResponse(res, ERROR_MESSAGES.INCORRECT_FORMAT, HTTP_STATUS.BAD_REQUEST, {
            errors: formatZodErrors(result.error.errors),
        });
        return;
    }
    req.body = result.data;
    next();
};

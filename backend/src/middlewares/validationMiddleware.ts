import { Request, Response, NextFunction } from "express";
import { sendErrorResponse } from "@/utils";
import { ERROR_MESSAGES, HTTP_STATUS } from "@/constants";
import { signUpValidationSchema, signInValidationSchema, emailCodeValidationSchema, forgotPasswordValidationSchema, resetPasswordValidationSchema} from "@/validations/authValidations";

export const validateSignUp = (req: Request, res: Response, next: NextFunction): void => {
    const result = signUpValidationSchema.safeParse(req.body);

    if (!result.success) {
        sendErrorResponse(res, ERROR_MESSAGES.INCORRECT_FORMAT, HTTP_STATUS.BAD_REQUEST, { errors: result.error.errors });
        return;
    }

    req.body = result.data;
    next();
};

export const validateSignIn = (req: Request, res: Response, next: NextFunction): void => {
    const result = signInValidationSchema.safeParse(req.body);

    if (!result.success) {
        sendErrorResponse(res, ERROR_MESSAGES.INCORRECT_FORMAT, HTTP_STATUS.BAD_REQUEST, {
            errors: result.error.errors,
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
            errors: result.error.errors,
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
            errors: result.error.errors,
        });
        return;
    }

    req.body = result.data;
    next();
};

export const validateResetPassword = (req: Request, res: Response, next: NextFunction): void => {
    const { token } = req.params;
    const { password } = req.body;

    const result = resetPasswordValidationSchema.safeParse({ token, password });
    if (!result.success) {
        sendErrorResponse(res, ERROR_MESSAGES.INCORRECT_FORMAT, HTTP_STATUS.BAD_REQUEST, {
            errors: result.error.errors,
        });
        return;
    }

    req.body = result.data;
    next();
};

import { Request, Response, NextFunction } from "express";
import { sendErrorResponse } from "@/utils";
import { ERROR_MESSAGES, HTTP_STATUS } from "@/constants";

import { forgotPasswordValidationSchema } from "@/validations/authValidations";

export const validateForgotPassword = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = forgotPasswordValidationSchema.safeParse(req.body);

  if (!result.success) {
    sendErrorResponse(
      res,
      ERROR_MESSAGES.INCORRECT_FORMAT,
      HTTP_STATUS.BAD_REQUEST,
      {
        errors: result.error.errors,
      }
    );
    return;
  }

  req.body = result.data;
  next();
};

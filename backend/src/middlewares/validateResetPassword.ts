import { Request, Response, NextFunction } from "express";
import { sendErrorResponse } from "@/utils";
import { ERROR_MESSAGES, HTTP_STATUS } from "@/constants";

import { resetPasswordValidationSchema } from "@/validations/authValidations";

export const validateResetPassword = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { token } = req.params;
  const { password } = req.body;

  const result = resetPasswordValidationSchema.safeParse({ token, password });
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

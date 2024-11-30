import { Request, Response, NextFunction } from "express";
import { sendErrorResponse } from "@/utils";
import { ERROR_MESSAGES, HTTP_STATUS } from "@/constants";

import { emailCodeValidationSchema } from "@/validations/authValidations";

export const validateEmailCode = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = emailCodeValidationSchema.safeParse(req.body);

  if (!result.success) {
    sendErrorResponse(
      res,
      ERROR_MESSAGES.INVALID_VERIFICATION_CODE,
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

import { Request, Response, NextFunction } from "express";
import { sendErrorResponse } from "@/utils";
import { ERROR_MESSAGES, HTTP_STATUS } from "@/constants";

import { signInValidationSchema } from "@/validations/authValidations";

export const validateSignIn = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = signInValidationSchema.safeParse(req.body);

  if (!result.success) {
    console.log("middleware working")
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

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendErrorResponse } from "@/utils";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";

export const verifyAuthToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.authToken;
  if (!token) {
    return sendErrorResponse(
      res,
      ERROR_MESSAGES.UNAUTHORIZED_TOKEN,
      HTTP_STATUS.UNAUTHORIZED
    );
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return sendErrorResponse(
      res,
      ERROR_MESSAGES.JWT_SECRET_NOT_DEFINED,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
  try {
    const decoded = jwt.verify(token, secret);
    if (!decoded || typeof decoded === "string") {
      return sendErrorResponse(
        res,
        ERROR_MESSAGES.TOKEN_DECODING_FAILED,
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
    req.userId = decoded.userId;

    next();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Token verification failed:", error.message);

      if (error.name === "TokenExpiredError") {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.TOKEN_EXPIRED,
          HTTP_STATUS.UNAUTHORIZED
        );
      } else if (error.name === "JsonWebTokenError") {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.INVALID_TOKEN,
          HTTP_STATUS.UNAUTHORIZED
        );
      } else {
        return sendErrorResponse(
          res,
          ERROR_MESSAGES.TOKEN_VERIFICATION_FAILED,
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    } else {
      // Fallback for non-Error objects, though unlikely in this case
      console.error("An unknown error occurred during token verification");
      return sendErrorResponse(
        res,
        ERROR_MESSAGES.UNKNOWN_ERROR,
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }
};

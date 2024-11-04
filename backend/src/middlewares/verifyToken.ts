import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendErrorResponse } from "@/utils";

export const verifyAuthToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.authToken;
  if (!token) {
    return sendErrorResponse(res, "Unauthorized or no token provided", 401);
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return sendErrorResponse(res, "JWT secret is not defined", 500);
  }
  try {
    const decoded = jwt.verify(token, secret);
    if (!decoded || typeof decoded === "string") {
      return sendErrorResponse(res, "Token decoding failed", 500);
    }
    req.userId = decoded.userId;

    next();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Token verification failed:", error.message);

      if (error.name === "TokenExpiredError") {
        return sendErrorResponse(res, "Token has expired", 401);
      } else if (error.name === "JsonWebTokenError") {
        return sendErrorResponse(res, "Invalid token", 401);
      } else {
        return sendErrorResponse(res, "Token verification failed", 500);
      }
    } else {
      // Fallback for non-Error objects, though unlikely in this case
      console.error("An unknown error occurred during token verification");
      return sendErrorResponse(res, "Unknown error occurred", 500);
    }
  }
};

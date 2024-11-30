import { Request, Response, NextFunction } from "express";
import User from "@/models/UserModel";
import { sendErrorResponse } from "@/utils";
import { ERROR_MESSAGES } from "@/constants";

export const checkExistingUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, username } = req.body;

  try {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        sendErrorResponse(res, ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      } else if (existingUser.username === username) {
        sendErrorResponse(res, ERROR_MESSAGES.USERNAME_ALREADY_EXISTS);
      }
      return;
    }

    next();
  } catch (error) {
    console.error("Error checking existing user:", error);
    sendErrorResponse(res, ERROR_MESSAGES.UNEXPECTED_ERROR);
  }
};

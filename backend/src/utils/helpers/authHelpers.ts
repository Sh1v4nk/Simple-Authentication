import jwt from "jsonwebtoken";
import { Response } from "express";
import { ObjectId } from "mongoose";
import { TIMING_CONSTANTS } from "@/constants";

/**
 * Generates a JWT token and sets it as a cookie in the response.
 *
 * @param res - The Express response object to set the cookie.
 * @param userId - The user ID to be included in the token payload.
 * @returns The generated JWT token.
 */

export const generateTokenAndSetCookie = (
  res: Response,
  userId: ObjectId
): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d", // Token expires in 7 days
  });

  res.cookie("authToken", token, {
    httpOnly: true,
    sameSite: "none",
    maxAge: TIMING_CONSTANTS.SEVEN_DAYS,
    secure: process.env.NODE_ENV === "production",
  });

  return token;
};

import type { Response } from "express";
import type { ObjectId } from "mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export function generateEmailVerificationToken(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function generateResetPasswordToken(): string {
  return crypto.randomBytes(20).toString("hex");
}

export const generateTokenAndSetCookie = (
  res: Response,
  userId: ObjectId
): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("authToken", token, {
    httpOnly: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    secure: process.env.NODE_ENV === "production",
  });

  return token;
};

import type { Request, Response } from "express";
import type { ObjectId } from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

import User from "../models/UserModel";
import {
  signupValidation,
  signinValidation,
} from "../validations/authValidations";
import {
  sendSuccessResponse,
  sendErrorResponse,
  generateEmailVerificationToken,
  generateTokenAndSetCookie,
} from "../utils";
import {
  sendVerificationToken,
  successfulVerificationEmail,
} from "../../configs/NodeMailer/SendEmail";

dotenv.config();

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = signupValidation.safeParse(req.body);

    if (!result.success) {
      sendErrorResponse(res, "Incorrect Format", 400, {
        errors: result.error.errors,
      });
      return;
    }

    const { username, email, password } = result.data;

    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      sendErrorResponse(res, "Email already exists");
      return;
    }

    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      sendErrorResponse(res, "Username already exists");
      return;
    }

    const saltRounds: number = parseInt(process.env.SALT_ROUNDS || "10", 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const emailVerificationToken = generateEmailVerificationToken();

    const newUser = new User({
      email,
      password: hashedPassword,
      username,
      emailVerificationToken,
      emailVerificationTokenExpiresAt: Date.now() + FIFTEEN_MINUTES_IN_MS,
    });

    await newUser.save();

    sendVerificationToken(
      newUser.username,
      newUser.email,
      emailVerificationToken
    );

    sendSuccessResponse(res, "User created successfully", {
      user: {
        ...newUser.toObject(),
        password: undefined,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    sendErrorResponse(res, message, 500);
    console.error("Error during signUp:", error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { emailCode } = req.body;

  try {
    const user = await User.findOne({
      emailVerificationToken: emailCode,
      emailVerificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      sendErrorResponse(res, "Invalid or expired verification code");
      return;
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiresAt = undefined;
    await user.save();

    await successfulVerificationEmail(user.username, user.email);

    sendSuccessResponse(res, "Email verified successfully", {
      user: {
        ...user.toObject(),
        password: undefined,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    sendErrorResponse(res, message, 500);
    console.error("Error during email verification:", error);
  }
};

export const signin = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = signinValidation.safeParse(req.body);

    if (!result.success) {
      sendErrorResponse(res, "Incorrect Format", 400, {
        errors: result.error.errors,
      });
      return;
    }

    const { email, password } = result.data;

    const user = await User.findOne({ email });

    if (!user) {
      await bcrypt.compare(password, "randomstring"); // To avoid revealing whether the user exists
      sendErrorResponse(res, "Invalid credentials");
      return;
    }

    const matchPass = await bcrypt.compare(password, user.password);
    if (!matchPass) {
      sendErrorResponse(res, "Invalid credentials");
      return;
    }

    const token = generateTokenAndSetCookie(res, user._id as ObjectId);

    user.lastLogin = new Date();
    await user.save();

    sendSuccessResponse(res, "SignIn successful", {
      token,
      user: {
        ...user.toObject(),
        password: undefined,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    sendErrorResponse(res, message, 500);
    console.error("Error during signIn:", error);
  }
};

export const signout = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie("authToken");
    sendSuccessResponse(res, "Sign Out successful");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    sendErrorResponse(res, message, 500);
    console.error("Error during sign out:", error);
  }
};

export const forgotPassword = ()=>{
  
}
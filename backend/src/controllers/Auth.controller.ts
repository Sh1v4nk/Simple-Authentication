import type { Request, Response } from "express";
import type { ObjectId } from "mongoose";
import bcrypt from "bcrypt";
import { z } from "zod";
import dotenv from "dotenv";

import User from "../models/UserModel";
import { generateToken, generateTokenAndSetCookie } from "../utils";
import {
  sendVerificationToken,
  successfulVerificationEmail,
} from "../../configs/NodeMailer/SendEmail";

dotenv.config();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(1),
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = signupSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Incorrect Format",
        errors: result.error.errors,
      });
      return;
    }

    const { username, email, password } = result.data;

    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      res.status(400).json({ success: false, message: "Email already exists" });
      return;
    }

    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      res
        .status(400)
        .json({ success: false, message: "Username already exists" });
      return;
    }

    const saltRounds: number = parseInt(process.env.SALT_ROUNDS || "10", 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const verificationToken = generateToken();

    const newUser = new User({
      email,
      password: hashedPassword,
      username,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + FIFTEEN_MINUTES_IN_MS,
    });

    await newUser.save();

    sendVerificationToken(newUser.username, newUser.email, verificationToken);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        ...newUser.toObject(),
        password: undefined,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Handle other standard errors
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        details: error.message,
      });
    } else {
      // Handle unknown errors
      res.status(500).json({
        success: false,
        message: "An unexpected error occurred",
        details: String(error),
      });
    }

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
      verificationToken: emailCode,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
      return;
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    await successfulVerificationEmail(user.username, user.email);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        ...user.toObject(),
        password: undefined,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Handle other standard errors
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        details: error.message,
      });
    } else {
      // Handle unknown errors
      res.status(500).json({
        success: false,
        message: "An unexpected error occurred",
        details: String(error),
      });
    }

    console.error("Error during email verification:", error);
  }
};

export const signin = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = signinSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Incorrect Format",
        errors: result.error.errors,
      });
      return;
    }

    const { email, password } = result.data;

    const user = await User.findOne({ email });

    if (!user) {
      await bcrypt.compare(password, "randomstring"); // This avoids revealing whether the user exists or not.
      res.status(400).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const matchPass = await bcrypt.compare(password, user.password);
    if (!matchPass) {
      res.status(400).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const token = generateTokenAndSetCookie(res, user._id as ObjectId);

    user.lastLogin = new Date();
    await user.save();

    // Successful login
    res.status(200).json({
      success: true,
      message: "SignIn successful",
      token,
      user: {
        ...user.toObject(),
        password: undefined,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        details: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "An unexpected error occurred",
        details: String(error),
      });
    }

    console.error("Error during signIn:", error);
  }
};

export const signout = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie("authToken");

    res.status(200).json({
      success: true,
      message: "Sign Out successful",
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error during sign out",
      details:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
    console.error("Error during sign out:", error);
  }
};

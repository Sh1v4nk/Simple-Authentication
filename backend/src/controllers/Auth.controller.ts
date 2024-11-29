import type { Request, Response } from "express";
import type { ObjectId } from "mongoose";
import User from "@/models/UserModel";

import {
  signUpValidation,
  emailCodeValidation,
  signInValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from "@/validations/authValidations";

import {
  HTTP_STATUS,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  TIMING_CONSTANTS,
} from "@/constants";

import {
  hashPassword,
  comparePassword,
  generateTokenAndSetCookie,
  generateEmailVerificationToken,
  generateResetPasswordToken,
} from "@/utils/helpers";

import { sendSuccessResponse, sendErrorResponse } from "@/utils";

import {
  sendVerificationToken,
  successfulVerificationEmail,
  resetPasswordEmail,
  passwordResetSuccessfulEmail,
} from "@/configs/NodeMailer/SendEmail";

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = signUpValidation.safeParse(req.body);

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

    const { username, email, password } = result.data;

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

    const hashedPassword = await hashPassword(password);
    const emailVerificationToken = generateEmailVerificationToken();

    const newUser = new User({
      email,
      password: hashedPassword,
      username,
      emailVerificationToken,
      emailVerificationTokenExpiresAt: new Date(
        Date.now() + TIMING_CONSTANTS.FIFTEEN_MINUTES
      ),
    });

    await newUser.save();

    await sendVerificationToken(
      newUser.username,
      newUser.email,
      emailVerificationToken
    );

    sendSuccessResponse(res, SUCCESS_MESSAGES.USER_CREATED, {
      user: {
        ...newUser.toObject(),
        password: undefined,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
    sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    console.error("Error during signUp:", error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = emailCodeValidation.safeParse(req.body);

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
    const { emailCode } = result.data;

    const user = await User.findOne({
      emailVerificationToken: emailCode,
      emailVerificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      sendErrorResponse(res, ERROR_MESSAGES.EXPIRED_VERIFICATION_CODE);
      return;
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiresAt = undefined;
    await user.save();

    await successfulVerificationEmail(user.username, user.email);

    sendSuccessResponse(res, SUCCESS_MESSAGES.EMAIL_VERIFIED, {
      user: {
        ...user.toObject(),
        password: undefined,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
    sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    console.error("Error during email verification:", error);
  }
};

export const signin = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = signInValidation.safeParse(req.body);

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

    const { email, password } = result.data;

    const user = await User.findOne({ email });

    const dummyPassword = "dummyPasswordForComparison"; // This is just a placeholder

    if (!user) {
      await comparePassword(password, dummyPassword); // To avoid revealing whether the user exists
      sendErrorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS);
      return;
    }

    const matchPass = await comparePassword(password, user.password);
    if (!matchPass) {
      sendErrorResponse(res, ERROR_MESSAGES.INVALID_CREDENTIALS);
      return;
    }

    generateTokenAndSetCookie(res, user._id as ObjectId);
    user.lastLogin = new Date();
    await user.save();

    sendSuccessResponse(res, SUCCESS_MESSAGES.SIGN_IN_SUCCESSFUL, {
      user: {
        ...user.toObject(),
        password: undefined,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
    sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    console.error("Error during signIn:", error);
  }
};

export const signout = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie("authToken", {
      httpOnly: true,
      sameSite: "none",
      secure: process.env.NODE_ENV === "production",
    });
    sendSuccessResponse(res, SUCCESS_MESSAGES.SIGN_OUT_SUCCESSFUL);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    console.error("Error during sign out:", error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = forgotPasswordValidation.safeParse(req.body);

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

    const { email } = result.data;

    const user = await User.findOne({ email });

    if (!user) {
      sendSuccessResponse(res, SUCCESS_MESSAGES.PASSWORD_RESET_LINK_SENT); // It prevents revealing if user exists
      return;
    }

    user.resetPasswordToken = generateResetPasswordToken();
    user.resetPasswordTokenExpiresAt = new Date(
      Date.now() + TIMING_CONSTANTS.ONE_HOUR
    );

    await user.save();

    await resetPasswordEmail(
      user.username,
      user.email,
      `${process.env.CLIENT_URL}/reset-password/${user.resetPasswordToken}`
    );

    sendSuccessResponse(res, SUCCESS_MESSAGES.PASSWORD_RESET_LINK_SENT);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    console.error("Error while processing forgot password:", error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const result = resetPasswordValidation.safeParse({ token, password });
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

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      sendErrorResponse(res, ERROR_MESSAGES.EXPIRED_RESET_TOKEN);
      return;
    }
    // updating password
    const hashedPassword = await hashPassword(password);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpiresAt = undefined;
    await user.save();

    await passwordResetSuccessfulEmail(user.username, user.email);

    sendSuccessResponse(res, SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESSFUL);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    console.error("Error while processing reset password:", error);
  }
};

export const verifyAuth = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.userId) {
    sendErrorResponse(
      res,
      ERROR_MESSAGES.UNAUTHORIZED_USER_ID,
      HTTP_STATUS.UNAUTHORIZED
    );
    return;
  }
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      sendErrorResponse(
        res,
        ERROR_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND
      );
      return;
    }

    sendSuccessResponse(res, SUCCESS_MESSAGES.USER_FOUND, {
      user: {
        ...user.toObject({ versionKey: false }),
        password: undefined,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    sendErrorResponse(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    console.error("Error in verifyAuth:", error);
  }
};

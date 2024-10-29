import { Document } from "mongoose";

export interface IUser extends Document {
    email: string;
    password: string;
    username: string;
    lastLogin: Date;
    isVerified: boolean;
    resetPasswordToken: boolean;
    resetPasswordExpiresAt: Date;
    emailVerificationToken: string | undefined;
    emailVerificationTokenExpiresAt: Date | undefined;
  }
  
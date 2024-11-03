import { Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  username: string;
  lastLogin: Date;
  isVerified: boolean;
  resetPasswordToken?: string | undefined;
  resetPasswordTokenExpiresAt?: Date | undefined;
  emailVerificationToken?: string | undefined;
  emailVerificationTokenExpiresAt?: Date | undefined;
}

// Extend the Request interface
declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

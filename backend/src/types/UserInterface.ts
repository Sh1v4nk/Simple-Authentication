import { Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  username: string;
  lastLogin: Date;
  isVerified: boolean;
  resetPasswordToken?: string;
  resetPasswordTokenExpiresAt?: Date;
  emailVerificationToken?: string;
  emailVerificationTokenExpiresAt?: Date;
}

// Extend the Request interface
declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

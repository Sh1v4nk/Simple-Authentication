import mongoose, { Document, Schema, Model } from "mongoose";

interface IUser extends Document {
  email: string;
  password: string;
  username: string;
  lastLogin: Date;
  isVerified: boolean;
  resetPasswordToken: boolean;
  resetPasswordExpiresAt: Date;
  verificationToken: string | undefined;
  verificationTokenExpiresAt: Date | undefined;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);

export default User;

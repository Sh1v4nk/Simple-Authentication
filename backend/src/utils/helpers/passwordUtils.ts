import bcrypt from "bcrypt";
import crypto from "crypto";
import { SECURITY_CONSTANTS } from "@/constants";

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, SECURITY_CONSTANTS.SALT_ROUNDS);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword);
};

export const generateResetPasswordToken = (): string => {
    return crypto.randomBytes(20).toString("hex");
};

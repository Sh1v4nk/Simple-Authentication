import bcrypt from "bcrypt";
import { SECURITY_CONSTANTS } from "@/constants/security";

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, SECURITY_CONSTANTS.SALT_ROUNDS);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword);
};

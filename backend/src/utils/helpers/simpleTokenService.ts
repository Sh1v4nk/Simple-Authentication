import jwt, { SignOptions } from "jsonwebtoken";
import { Response } from "express";
import { ObjectId } from "mongoose";
import { TIMING_CONSTANTS } from "@/constants";

/**
 * Generates a JWT token and sets it as a cookie in the response.
 * Based on your working version with simplified approach.
 *
 * @param res - The Express response object to set the cookie.
 * @param userId - The user ID to be included in the token payload.
 * @returns The generated JWT token.
 */
export const generateTokenAndSetCookie = (
    res: Response,
    userId: ObjectId,
    tokenExpiryTime: string = "7d" // Default Token expires is 7 days
): string => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables.");
    }

    const token = jwt.sign({ userId }, process.env.JWT_SECRET!, {
        expiresIn: tokenExpiryTime as any,
    });

    res.cookie("authToken", token, {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: TIMING_CONSTANTS.SEVEN_DAYS,
        secure: process.env.NODE_ENV === "production",
        path: "/",
    });

    console.log(`🍪 AuthToken cookie set - Production: ${process.env.NODE_ENV === "production"}`);

    return token;
};

/**
 * Extract auth token from request (cookie or header)
 */
export const extractAuthToken = (req: any): string | null => {
    // Try authToken cookie first
    let token = req.cookies?.authToken;

    // Fallback to Authorization header
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
    }

    return token || null;
};

/**
 * Verify auth token
 */
export const verifyAuthToken = (token: string): { userId: string } | null => {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in environment variables.");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
        return decoded;
    } catch (error) {
        return null;
    }
};

/**
 * Clear auth token cookie
 */
export const clearAuthCookie = (res: Response): void => {
    res.clearCookie("authToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        path: "/",
    });
};

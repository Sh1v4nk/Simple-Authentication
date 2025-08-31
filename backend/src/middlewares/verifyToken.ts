import type { Request, Response, NextFunction } from "express";
import { sendErrorResponse } from "@/utils";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
import { TokenService } from "@/utils/helpers";

export const verifyAuthToken = (req: Request, res: Response, next: NextFunction) => {
    try {
        // Extract access token
        const accessToken = TokenService.extractAccessToken(req);

        if (!accessToken) {
            return sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_TOKEN, HTTP_STATUS.UNAUTHORIZED);
        }

        // Verify access token
        const decoded = TokenService.verifyAccessToken(accessToken);

        if (!decoded) {
            return sendErrorResponse(res, ERROR_MESSAGES.TOKEN_EXPIRED, HTTP_STATUS.UNAUTHORIZED);
        }

        req.userId = decoded.userId.toString();
        next();
    } catch (error: unknown) {
        console.error("Token verification failed:", error);
        return sendErrorResponse(res, ERROR_MESSAGES.UNEXPECTED_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

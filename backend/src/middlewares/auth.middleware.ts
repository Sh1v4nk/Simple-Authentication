import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendErrorResponse } from "@/utils/response";
import { TokenService } from "@/services/token.service";
import { getEnv } from "@/configs/env";
import { HTTP_STATUS, ERROR_MESSAGES } from "@/constants/enums";
import { JWT_ALGORITHM } from "@/constants/security";
import type { AccessTokenClaims } from "@/types/token.types";

const handleJwtError = (req: Request, res: Response, error: unknown): void => {
    if (!(error instanceof Error)) {
        sendErrorResponse(res, ERROR_MESSAGES.UNKNOWN_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        return;
    }
    switch (error.name) {
        case "TokenExpiredError":
            sendErrorResponse(res, ERROR_MESSAGES.TOKEN_EXPIRED, HTTP_STATUS.UNAUTHORIZED);
            break;
        case "JsonWebTokenError":
            sendErrorResponse(res, ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
            break;
        case "NotBeforeError":
            sendErrorResponse(res, ERROR_MESSAGES.TOKEN_NOT_ACTIVE, HTTP_STATUS.UNAUTHORIZED);
            break;
        default:
            req.log.error({ err: error }, "[VERIFY_TOKEN] Unexpected JWT error");
            sendErrorResponse(res, ERROR_MESSAGES.TOKEN_VERIFICATION_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

const decodeAndValidate = (token: string, secret: string, audience: string, issuer: string): AccessTokenClaims | null => {
    const decoded = jwt.verify(token, secret, { audience, issuer, algorithms: [JWT_ALGORITHM] });
    if (!decoded || typeof decoded === "string") return null;
    if (decoded.type !== "access") return null;
    if (!decoded.userId || !decoded.jti || !decoded.exp || typeof decoded.isVerified !== "boolean") return null;
    return decoded as AccessTokenClaims;
};

const getSecret = (): string => getEnv().JWT_SECRET;
const getAudience = (): string => getEnv().JWT_AUDIENCE;
const getIssuer = (): string => getEnv().JWT_ISSUER;

export const verifyAuthToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const accessToken = TokenService.extractAccessToken(req);
        if (!accessToken) {
            sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_TOKEN, HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        const decoded = decodeAndValidate(accessToken, getSecret(), getAudience(), getIssuer());
        if (!decoded) {
            sendErrorResponse(res, ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        const blocked = await TokenService.isAccessTokenBlocked(decoded.jti);
        if (blocked) {
            sendErrorResponse(res, ERROR_MESSAGES.TOKEN_EXPIRED, HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        req.userId = decoded.userId;
        req.tokenJti = decoded.jti;
        req.tokenExp = decoded.exp;
        req.tokenIsVerified = decoded.isVerified;
        next();
    } catch (error) {
        handleJwtError(req, res, error);
    }
};

export const verifyAccessTokenSignature = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const accessToken = TokenService.extractAccessToken(req);
        if (!accessToken) {
            sendErrorResponse(res, ERROR_MESSAGES.UNAUTHORIZED_TOKEN, HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        const decoded = decodeAndValidate(accessToken, getSecret(), getAudience(), getIssuer());
        if (!decoded) {
            sendErrorResponse(res, ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED);
            return;
        }

        req.userId = decoded.userId;
        req.tokenJti = decoded.jti;
        req.tokenExp = decoded.exp;
        req.tokenIsVerified = decoded.isVerified;
        next();
    } catch (error) {
        handleJwtError(req, res, error);
    }
};

export const attachAuthContextIfPresent = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const accessToken = TokenService.extractAccessToken(req);
    if (!accessToken) {
        next();
        return;
    }

    try {
        const decoded = decodeAndValidate(accessToken, getSecret(), getAudience(), getIssuer());
        if (!decoded) {
            next();
            return;
        }

        req.userId = decoded.userId;
        req.tokenJti = decoded.jti;
        req.tokenExp = decoded.exp;
        req.tokenIsVerified = decoded.isVerified;
    } catch {
        // Signout should still be allowed when the access token is missing or expired.
    }

    next();
};

export const requireVerified = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tokenIsVerified) {
        sendErrorResponse(res, "Email verification required", HTTP_STATUS.FORBIDDEN, {
            code: "EMAIL_NOT_VERIFIED",
        });
        return;
    }

    next();
};

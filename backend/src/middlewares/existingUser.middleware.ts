import type { Request, Response, NextFunction } from "express";
import User from "@/models/user.model";
import { sendErrorResponse } from "@/utils/response";
import { ERROR_MESSAGES, HTTP_STATUS } from "@/constants/enums";

export const checkExistingUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
    const username = String(req.body?.username || "")
        .trim()
        .toLowerCase();

    req.body.email = email;
    req.body.username = username;

    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            if (existingUser.email === email) {
                sendErrorResponse(res, ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
            } else {
                sendErrorResponse(res, ERROR_MESSAGES.USERNAME_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
            }
            return;
        }

        next();
    } catch (error) {
        req.log.error({ err: error }, "[CHECK_USER] Error");
        sendErrorResponse(res, ERROR_MESSAGES.UNEXPECTED_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

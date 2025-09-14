import type { Response } from "express";

export const sendSuccessResponse = (res: Response, message: string, data: object = {}) => {
    res.status(200).json({
        success: true,
        message,
        ...data,
    });
};

export const sendErrorResponse = (res: Response, message: string, code = 400, data: object = {}) => {
    res.status(code).json({
        success: false,
        message,
        ...data,
    });
};

import { getEmailClient, sender } from "@/configs/email";
import { logger } from "@/configs/logger";
import {
    SUCCESSFUL_VERIFICATION_EMAIL_TEMPLATE,
    VERIFICATION_EMAIL_TEMPLATE,
    PASSWORD_RESET_REQUEST_TEMPLATE,
    PASSWORD_RESET_SUCCESS_TEMPLATE,
} from "@/utils/emailTemplates";

const companyName = "Auth";

export async function sendVerificationToken(username: string, email: string, verificationToken: string) {
    try {
        if (!email || !verificationToken) {
            throw new Error("Email and verification token are required.");
        }

        await getEmailClient().send({
            from: sender,
            to: [{ email }],
            subject: "Verify your email",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{userName}", username)
                .replace("{verificationCode}", verificationToken)
                .replace("{companyName}", companyName),
            category: "Verification",
        });

        logger.info("[EMAIL] Verification email sent");
    } catch (error) {
        logger.error({ err: error }, "[EMAIL] Failed to send verification email");
        throw error;
    }
}

export async function successfulVerificationEmail(username: string, email: string) {
    try {
        if (!email) throw new Error("Email is required.");

        await getEmailClient().send({
            from: sender,
            to: [{ email }],
            subject: "Email verified successfully",
            html: SUCCESSFUL_VERIFICATION_EMAIL_TEMPLATE.replace("{userName}", username).replace(/{companyName}/g, companyName),
            category: "Verification Success",
        });

        logger.info("[EMAIL] Verification success email sent");
    } catch (error) {
        logger.error({ err: error }, "[EMAIL] Failed to send success email");
        throw error;
    }
}

export async function resetPasswordEmail(username: string, email: string, resetUrl: string) {
    try {
        if (!email) throw new Error("Email is required.");

        await getEmailClient().send({
            from: sender,
            to: [{ email }],
            subject: "Reset your password",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{userName}", username)
                .replace("{companyName}", companyName)
                .replace("{resetURL}", resetUrl),
            category: "Password Reset",
        });

        logger.info("[EMAIL] Password reset email sent");
    } catch (error) {
        logger.error({ err: error }, "[EMAIL] Failed to send password reset email");
        throw error;
    }
}

export async function passwordResetSuccessfulEmail(username: string, email: string) {
    try {
        if (!email) throw new Error("Email is required.");

        await getEmailClient().send({
            from: sender,
            to: [{ email }],
            subject: "Password reset successful",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE.replace("{userName}", username).replace("{companyName}", companyName),
            category: "Password Reset Success",
        });

        logger.info("[EMAIL] Password reset success email sent");
    } catch (error) {
        logger.error({ err: error }, "[EMAIL] Failed to send password reset success email");
        throw error;
    }
}

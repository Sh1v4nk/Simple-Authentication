import { getEmailClient, sender } from "@/configs/email";
import { logger } from "@/configs/logger";
import {
    SUCCESSFUL_VERIFICATION_EMAIL_TEMPLATE,
    VERIFICATION_EMAIL_TEMPLATE,
    PASSWORD_RESET_REQUEST_TEMPLATE,
    PASSWORD_RESET_SUCCESS_TEMPLATE,
} from "@/utils/emailTemplates";

const companyName = "Auth";

interface EmailData {
    to: string;
    subject: string;
    html: string;
    category: string;
}

const MAX_RETRIES = 2;

const sendEmail = async (data: EmailData): Promise<void> => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            await getEmailClient().send({
                from: sender,
                to: [{ email: data.to }],
                subject: data.subject,
                html: data.html,
                category: data.category,
            });
            logger.info({ category: data.category }, "[EMAIL] Sent");
            return;
        } catch (err) {
            if (attempt === MAX_RETRIES) {
                logger.error({ err, category: data.category, to: data.to, attempts: attempt + 1 }, "[EMAIL] All retry attempts failed");
                return;
            }
            const backoffMs = (attempt + 1) * 1000;
            logger.warn({ attempt: attempt + 1, category: data.category, err }, `[EMAIL] Retrying in ${backoffMs}ms`);
            await new Promise((r) => setTimeout(r, backoffMs));
        }
    }
};

export async function sendVerificationToken(username: string, email: string, verificationToken: string): Promise<void> {
    if (!email || !verificationToken) {
        logger.error("[EMAIL] Email and verification token are required");
        return;
    }

    await sendEmail({
        to: email,
        subject: "Verify your email",
        html: VERIFICATION_EMAIL_TEMPLATE.replace("{userName}", username)
            .replace("{verificationCode}", verificationToken)
            .replace("{companyName}", companyName),
        category: "Verification",
    });
}

export async function successfulVerificationEmail(username: string, email: string): Promise<void> {
    if (!email) {
        logger.error("[EMAIL] Email is required");
        return;
    }

    await sendEmail({
        to: email,
        subject: "Email verified successfully",
        html: SUCCESSFUL_VERIFICATION_EMAIL_TEMPLATE.replace("{userName}", username).replace(/{companyName}/g, companyName),
        category: "Verification Success",
    });
}

export async function resetPasswordEmail(username: string, email: string, resetUrl: string): Promise<void> {
    if (!email) {
        logger.error("[EMAIL] Email is required");
        return;
    }

    await sendEmail({
        to: email,
        subject: "Reset your password",
        html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{userName}", username)
            .replace("{companyName}", companyName)
            .replace("{resetURL}", resetUrl),
        category: "Password Reset",
    });
}

export async function passwordResetSuccessfulEmail(username: string, email: string): Promise<void> {
    if (!email) {
        logger.error("[EMAIL] Email is required");
        return;
    }

    await sendEmail({
        to: email,
        subject: "Password reset successful",
        html: PASSWORD_RESET_SUCCESS_TEMPLATE.replace("{userName}", username).replace("{companyName}", companyName),
        category: "Password Reset Success",
    });
}

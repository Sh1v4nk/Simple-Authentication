import { client, sender } from "./EmailServer";
import {
    SUCCESSFUL_VERIFICATION_EMAIL_TEMPLATE,
    VERIFICATION_EMAIL_TEMPLATE,
    PASSWORD_RESET_REQUEST_TEMPLATE,
    PASSWORD_RESET_SUCCESS_TEMPLATE,
} from "@/utils";

const companyName = "Auth";

export async function sendVerificationToken(username: string, email: string, verificationToken: string) {
    try {
        if (!email || !verificationToken) {
            throw new Error("Email and verification token are required.");
        }

        await client.send({
            from: sender,
            to: [{ email }],
            subject: "Verify your email",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{userName}", username)
                .replace("{verificationCode}", verificationToken)
                .replace("{companyName}", companyName),
            category: "Verification",
        });

        console.log("Verification email sent successfully");
    } catch (error) {
        console.error("Error sending verification email:", error);
    }
}

export async function successfulVerificationEmail(username: string, email: string) {
    try {
        if (!email) throw new Error("Email is required.");

        await client.send({
            from: sender,
            to: [{ email }],
            subject: "Email verified successfully",
            html: SUCCESSFUL_VERIFICATION_EMAIL_TEMPLATE.replace("{userName}", username).replace(/{companyName}/g, companyName),
            category: "Verification Success",
        });

        console.log("Verification success email sent");
    } catch (error) {
        console.error("Error sending success email:", error);
    }
}

export async function resetPasswordEmail(username: string, email: string, resetPasswordToken: string) {
    try {
        if (!email) throw new Error("Email is required.");

        await client.send({
            from: sender,
            to: [{ email }],
            subject: "Reset your password",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{userName}", username)
                .replace("{companyName}", companyName)
                .replace("{resetURL}", resetPasswordToken),
            category: "Password Reset",
        });

        console.log("Password reset email sent");
    } catch (error) {
        console.error("Error sending password reset email:", error);
    }
}

export async function passwordResetSuccessfulEmail(username: string, email: string) {
    try {
        if (!email) throw new Error("Email is required.");

        await client.send({
            from: sender,
            to: [{ email }],
            subject: "Password reset successful",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE.replace("{userName}", username).replace("{companyName}", companyName),
            category: "Password Reset Success",
        });

        console.log("Password reset success email sent");
    } catch (error) {
        console.error("Error sending password reset success email:", error);
    }
}

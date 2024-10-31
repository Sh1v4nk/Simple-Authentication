import { transporter } from "./EmailServer";
import {
  SUCCESSFUL_VERIFICATION_EMAIL_TEMPLATE,
  VERIFICATION_EMAIL_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
} from "@/utils";

const companyName = "Auth";
const sender = `"XYZ" <xyz@ethereal.email>"`;

export async function sendVerificationToken(
  username: string,
  email: string,
  verificationToken: string
) {
  try {
    if (!email || !verificationToken) {
      throw new Error("Email and verification token are required.");
    }

    const response = await transporter.sendMail({
      from: sender,
      to: email,
      subject: "Verify Your Email",
      html: VERIFICATION_EMAIL_TEMPLATE.replace("{userName}", username)
        .replace("{verificationCode}", verificationToken)
        .replace("{companyName}", companyName),
    });

    console.log("Verification email sent successfully:", response.messageId);
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
}

export async function successfulVerificationEmail(
  username: string,
  email: string
) {
  try {
    if (!email) {
      throw new Error("Email is are required.");
    }

    const response = await transporter.sendMail({
      from: sender,
      to: email,
      subject: "Email Verified Successfully",
      html: SUCCESSFUL_VERIFICATION_EMAIL_TEMPLATE.replace(
        "{userName}",
        username
      ).replace(/{companyName}/g, companyName),
    });

    console.log("Email verification successful:", response.messageId);
  } catch (error) {
    console.error("Error sending succeessful verification email:", error);
  }
}

export async function resetPasswordEmail(
  username: string,
  email: string,
  resetPasswordToken: string
) {
  try {
    if (!email) {
      throw new Error("Email is are required.");
    }

    const response = await transporter.sendMail({
      from: sender,
      to: email,
      subject: "Reset Your Password",
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{userName}", username)
        .replace("{companyName}", companyName)
        .replace("{resetURL}", resetPasswordToken),
    });

    console.log("Password reset mail sent successfully:", response.messageId);
  } catch (error) {
    console.error("Error sending reset password email:", error);
  }
}

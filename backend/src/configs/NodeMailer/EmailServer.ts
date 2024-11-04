import nodemailer, { type Transporter } from "nodemailer";

const transporter: Transporter = nodemailer.createTransport({
  host:
    process.env.NODE_ENV === "development"
      ? "smtp.ethereal.email"
      : process.env.EMAIL_SERVICE || "gmail",
  port: process.env.NODE_ENV === "development" ? 587 : 465,
  secure: process.env.NODE_ENV !== "development", // true for production, false for development
  auth: {
    user:
      process.env.NODE_ENV === "development"
        ? process.env.TEMP_EMAIL
        : process.env.EMAIL_ID,
    pass:
      process.env.NODE_ENV === "development"
        ? process.env.TEMP_EMAIL_PASSWORD
        : process.env.EMAIL_PASSWORD,
  },
});

export { transporter };

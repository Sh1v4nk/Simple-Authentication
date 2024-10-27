import nodemailer from "nodemailer";

// Function to create and return a nodemailer transporter for development
// get host port and other info from https://ethereal.email/create
// export const transporter = nodemailer.createTransport({
//   host: "smtp.ethereal.email",
//   port: 587,
//   secure: false,
//   auth: {
//     user: "zakary43@ethereal.email",
//     pass: "ftqmcykFzzA9bqMEYw",
//   },
// });

// for production
export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVICE || "gmail",       // SMTP host
  port: 465,                                       // Use port 465 for secure
  secure: true,                                   // true for 465, ensures SSL/TLS
  auth: {
    user: process.env.EMAIL_ID,
      pass: process.env.EMAIL_PASSWORD,
  },
});

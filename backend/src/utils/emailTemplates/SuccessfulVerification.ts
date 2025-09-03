export const SUCCESSFUL_VERIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verified Successfully</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #f3f4f6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1e1e2e;">
  <div style="background: linear-gradient(to right, #8b5cf6, #10b981); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 1.8em;">Email Verified Successfully</h1>
  </div>
  <div style="background-color: #2e2e3e; padding: 20px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
    <p style="color: #d1d5db;">Hello, {userName}</p>
    <p style="color: #a3a3a3;">Congratulations! Your email has been successfully verified.</p>
    <p style="color: #a3a3a3;">You can now access all the features of your account on {companyName}.</p>
    <p style="color: #a3a3a3;">If you need any assistance, feel free to contact our support team.</p>
    <p style="color: #a3a3a3;">Thank you for verifying your email and joining us!</p>
    <p style="color: #8b5cf6;">Best regards,<br>The {companyName} Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

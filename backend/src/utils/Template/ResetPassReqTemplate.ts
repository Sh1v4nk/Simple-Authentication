export const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #f3f4f6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1e1e2e;">
  <div style="background: linear-gradient(to right, #8b5cf6, #10b981); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 1.8em;">Password Reset</h1>
  </div>
  <div style="background-color: #2e2e3e; padding: 20px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
    <p style="color: #d1d5db;">Hello, {userName}</p>
    <p style="color: #a3a3a3;">We received a request to reset your password. If you didn't make this request, please ignore this email.</p>
    <p style="color: #a3a3a3;">To reset your password, click the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{resetURL}" style="background-color: #8b5cf6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
    </div>
    <p style="color: #a3a3a3;">This link will expire in 1 hour for security reasons.</p>
    <p style="color: #8b5cf6;">Best regards,<br>The {companyName} Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

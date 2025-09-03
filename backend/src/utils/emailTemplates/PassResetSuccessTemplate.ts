export const PASSWORD_RESET_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #f3f4f6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1e1e2e;">
  <div style="background: linear-gradient(to right, #8b5cf6, #10b981); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 1.8em;">Password Reset Successful</h1>
  </div>
  <div style="background-color: #2e2e3e; padding: 20px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
    <p style="color: #d1d5db;">Hello, {userName}</p>
    <p style="color: #a3a3a3;">We're writing to confirm that your password has been successfully reset.</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #10b981; color: white; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; display: inline-block; font-size: 30px;">
        ✓
      </div>
    </div>
    <p style="color: #a3a3a3;">If you did not initiate this password reset, please contact our support team immediately.</p>
    <p style="color: #a3a3a3;">For security reasons, we recommend that you:</p>
    <ul style="color: #a3a3a3; margin-left: 20px;">
      <li>Use a strong, unique password</li>
      <li>Enable two-factor authentication if available</li>
      <li>Avoid using the same password across multiple sites</li>
    </ul>
    <p style="color: #a3a3a3;">Thank you for helping us keep your account secure.</p>
    <p style="color: #8b5cf6;">Best regards,<br>The {companyName} Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

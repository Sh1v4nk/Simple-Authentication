export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export const SUCCESS_MESSAGES = {
  USER_CREATED: "User created successfully",
  EMAIL_VERIFIED: "Email verified successfully",
  SIGN_IN_SUCCESSFUL: "Sign In successful",
  SIGN_OUT_SUCCESSFUL: "Sign Out successful",
  PASSWORD_RESET_LINK_SENT:
    "If this email is registered, a reset link will be sent",
  PASSWORD_RESET_SUCCESSFUL: "Password reset successful",
  USER_FOUND: "User found",
};

export const ERROR_MESSAGES = {
  INCORRECT_FORMAT: "Incorrect Format",

  // User-related errors
  EMAIL_ALREADY_EXISTS: "Email already exists",
  USERNAME_ALREADY_EXISTS: "Username already exists",
  INVALID_CREDENTIALS: "Invalid credentials",

  // Authorization-related errors
  UNAUTHORIZED_USER_ID: "Unauthorized: User ID not provided",
  UNAUTHORIZED_TOKEN: "Unauthorized: Token is missing or invalid",
  TOKEN_VERIFICATION_FAILED: "Token verification failed",

  // Token-specific errors
  USER_NOT_FOUND: "User not found",
  INVALID_VERIFICATION_CODE: "Invalid Verification Code",
  EXPIRED_VERIFICATION_CODE: "Invalid or expired verification code",
  EXPIRED_RESET_TOKEN: "Invalid or expired reset token",
  TOKEN_EXPIRED: "Token has expired",
  INVALID_TOKEN: "Invalid token",
  TOKEN_DECODING_FAILED: "Token decoding failed",

  // JWT errors
  JWT_SECRET_NOT_DEFINED: "JWT secret is not defined",

  // General error handling
  UNKNOWN_ERROR: "An unknown error occurred",
  UNEXPECTED_ERROR: "An unexpected error occurred",
};

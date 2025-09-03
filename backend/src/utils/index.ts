export { sendSuccessResponse, sendErrorResponse } from "./response";

export { hashPassword, comparePassword, generateResetPasswordToken } from "./passwordUtils";
export { generateEmailVerificationToken } from "./generateOtp";

export { TokenService } from "./tokenService";
export { runTokenCleanup } from "./tokenCleanup";

export { UserQueryOptimizer, ensureIndexes, checkDatabaseHealth } from "./databaseOptimization";

// Email Templates
export { VERIFICATION_EMAIL_TEMPLATE } from "./emailTemplates/VerificationTemplate";
export { PASSWORD_RESET_SUCCESS_TEMPLATE } from "./emailTemplates/PassResetSuccessTemplate";
export { PASSWORD_RESET_REQUEST_TEMPLATE } from "./emailTemplates/ResetPassReqTemplate";
export { SUCCESSFUL_VERIFICATION_EMAIL_TEMPLATE } from "./emailTemplates/SuccessfulVerification";

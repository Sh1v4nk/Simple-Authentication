export const SECURITY_CONSTANTS = {
  SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS || "10", 10),
};

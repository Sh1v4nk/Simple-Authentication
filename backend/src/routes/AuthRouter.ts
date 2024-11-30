import express from "express";

import {
  signup,
  signin,
  signout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  verifyAuth,
} from "@/controllers/Auth.controller";

import {
  verifyAuthToken,
  validateSignUp,
  validateSignIn,
  validateEmailCode,
  validateForgotPassword,
  validateResetPassword,
} from "@/middlewares";

const router = express.Router();

router.get("/verify-auth", verifyAuthToken, verifyAuth);

router.post("/signup", validateSignUp, signup);
router.post("/signin", validateSignIn, signin);
router.post("/signout", signout);

router.post("/verify-email", validateEmailCode, verifyEmail);
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/reset-password/:token", validateResetPassword, resetPassword);

export default router;

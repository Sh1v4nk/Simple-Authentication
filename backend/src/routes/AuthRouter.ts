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
import { verifyAuthToken } from "@/middlewares/verifyToken";

const router = express.Router();

router.get("/verify-token", verifyAuthToken, verifyAuth);

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/signout", signout);

router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;

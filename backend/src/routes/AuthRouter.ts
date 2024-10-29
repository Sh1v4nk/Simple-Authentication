import express from "express";
import {
  signup,
  signin,
  signout,
  verifyEmail,
  forgotPassword
} from "../controllers/Auth.controller";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/signout", signout);

router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);

export default router;

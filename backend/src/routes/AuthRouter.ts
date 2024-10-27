import express from "express";
import {
  signup,
  signin,
  signout,
  verifyEmail,
} from "../controllers/Auth.controller";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/signout", signout);

router.post("/verify-email", verifyEmail);

export default router;

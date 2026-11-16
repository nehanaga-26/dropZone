import { Router } from "express";
import {
  signUp,
  signIn,
  requestPasswordReset
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/forgot-password", requestPasswordReset);

export default router;
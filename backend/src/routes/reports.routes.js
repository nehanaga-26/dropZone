import { Router } from "express";
import { reportPost } from "../controllers/reports.controller.js";
import { attachUser, requireOwnership } from "../middleware/requireAuth.js";

const router = Router();
router.post("/", attachUser, requireOwnership("reporter_id"), reportPost);
export default router;

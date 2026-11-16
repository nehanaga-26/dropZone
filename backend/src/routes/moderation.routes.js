import { Router } from "express";
import { getQueue, review } from "../controllers/moderation.controller.js";

const router = Router();
router.get("/queue", getQueue);
router.post("/:id/review", review);
export default router;

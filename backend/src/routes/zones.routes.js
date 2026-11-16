import { Router } from "express";
import { getZones, checkZone, createZone } from "../controllers/zones.controller.js";
import { getZonePosts, createZonePost } from "../controllers/posts.controller.js";
import {
  getZoneAlerts,
  createZoneAlert,
  postVisit,
  deleteVisit,
  removeAlert,
} from "../controllers/alerts.controller.js";
import { postLimiter } from "../middleware/rateLimiter.js";
import { attachUser, requireOwnership } from "../middleware/requireAuth.js";

const router = Router();

router.get("/", getZones);
router.post("/", postLimiter, attachUser, createZone);
router.post("/:id/check", checkZone);
router.get("/:id/posts", getZonePosts);
router.post("/:id/posts", postLimiter, attachUser, requireOwnership("author_id"), createZonePost);
router.get("/:id/alerts", getZoneAlerts);
router.post("/:id/alerts", postLimiter, attachUser, requireOwnership("author_id"), createZoneAlert);
router.post("/:id/visits", attachUser, requireOwnership("author_id"), postVisit);
router.delete("/:id/visits", attachUser, requireOwnership("author_id"), deleteVisit);
router.delete("/:id/alerts/:alertId", removeAlert);

export default router;

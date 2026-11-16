import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { attachUser, requireOwnership } from "../middleware/requireAuth.js";

const router = Router();

// Block a user: { blocker_id, blocked_id }
router.post("/", attachUser, requireOwnership("blocker_id"), async (req, res, next) => {
  try {
    const { blocker_id, blocked_id } = req.body ?? {};
    if (!blocker_id || !blocked_id) {
      return res.status(400).json({ error: "blocker_id and blocked_id are required." });
    }
    if (blocker_id === blocked_id) {
      return res.status(400).json({ error: "You cannot block yourself." });
    }
    const { data, error } = await supabaseAdmin
      .from("blocks")
      .upsert({ blocker_id, blocked_id }, { onConflict: "blocker_id,blocked_id" })
      .select("*")
      .single();
    if (error) throw error;
    return res.status(201).json({ block: data });
  } catch (error) {
    next(error);
  }
});

// List who I blocked: GET /api/blocks?blocker_id=...
router.get("/", async (req, res, next) => {
  try {
    const { blocker_id } = req.query;
    if (!blocker_id) return res.status(400).json({ error: "blocker_id query is required." });
    const { data, error } = await supabaseAdmin
      .from("blocks")
      .select("blocked_id, created_at")
      .eq("blocker_id", blocker_id);
    if (error) throw error;
    return res.json({ blocked: data ?? [] });
  } catch (error) {
    next(error);
  }
});

// Unblock: DELETE /api/blocks  body { blocker_id, blocked_id }
router.delete("/", async (req, res, next) => {
  try {
    const { blocker_id, blocked_id } = req.body ?? {};
    if (!blocker_id || !blocked_id) {
      return res.status(400).json({ error: "blocker_id and blocked_id are required." });
    }
    const { error } = await supabaseAdmin
      .from("blocks")
      .delete()
      .eq("blocker_id", blocker_id)
      .eq("blocked_id", blocked_id);
    if (error) throw error;
    return res.json({ unblocked: true });
  } catch (error) {
    next(error);
  }
});

export default router;

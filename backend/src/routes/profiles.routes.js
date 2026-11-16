import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

const router = Router();

// Ensure a profile row exists for an auth user (service role bypasses RLS).
// Body: { id (auth user uuid), username }
router.post("/ensure", async (req, res, next) => {
  try {
    const { id, username } = req.body ?? {};
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: "id is required." });
    }
    const name = typeof username === "string" && username.trim()
      ? username.trim().slice(0, 60)
      : `user_${id.slice(0, 8)}`;

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, username")
      .eq("id", id)
      .single();

    if (existing) return res.json({ profile: existing });

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .insert({ id, username: name })
      .select("id, username")
      .single();

    if (error) throw error;
    return res.status(201).json({ profile: data });
  } catch (error) {
    next(error);
  }
});

export default router;

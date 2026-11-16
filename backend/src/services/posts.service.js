import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { calcExpiresAt } from "../utils/expiry.js";
import { getDemoCenter, distanceMeters } from "../utils/geofence.js";

// Real DB column is post_type (not kind). Allowed: lost, found, announcement, general.
// We map "study" -> "general" so PPT study-group demo still works.
const ALLOWED = new Set(["lost", "found", "announcement", "general"]);

export function normalizePostType(t) {
  if (t === "study" || t === "teammate" || t === "study-group") return "general";
  if (ALLOWED.has(t)) return t;
  return "general";
}

export function normalizeRadiusM(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(5000, Math.max(10, Math.round(n)));
}

export async function listActivePosts(zoneId, blockerId = null, viewer = null) {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("id, zone_id, author_id, title, body, post_type, radius_m, expires_at, created_at")
    .eq("zone_id", zoneId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  let posts = data ?? [];

  // Hide blocked users' posts from blocker (Slide 7: Block users).
  if (blockerId) {
    const { data: blocks } = await supabaseAdmin
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", blockerId);
    const blockedSet = new Set((blocks ?? []).map((b) => b.blocked_id));
    posts = posts.filter((p) => !blockedSet.has(p.author_id));
  }

  // Per-post radius: when viewer coords are known, a post is visible only
  // within its own radius of the zone centre (default: whole zone).
  if (viewer && typeof viewer.lat === "number" && typeof viewer.lng === "number") {
    const { data: zone } = await supabaseAdmin
      .from("zones")
      .select("name")
      .eq("id", zoneId)
      .single();
    const center = getDemoCenter(zone?.name || "");
    const d = Math.round(distanceMeters(viewer.lat, viewer.lng, center.lat, center.lng));
    posts = posts.filter((p) => d <= (p.radius_m ?? center.radiusM));
  }

  return posts;
}

export async function createPost({ zone_id, author_id, title, body, post_type, ttlHours, radiusM }) {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .insert({
      zone_id,
      author_id,
      title: title.trim(),
      body: body.trim(),
      post_type: normalizePostType(post_type),
      radius_m: normalizeRadiusM(radiusM),
      expires_at: calcExpiresAt(ttlHours),
    })
    .select("id, zone_id, author_id, title, body, post_type, radius_m, expires_at, created_at")
    .single();

  if (error) throw error;
  return data;
}

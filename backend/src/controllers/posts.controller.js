import { listActivePosts, createPost } from "../services/posts.service.js";
import { getZoneById } from "../services/zones.service.js";
import { timeRemaining } from "../utils/expiry.js";

export async function getZonePosts(req, res, next) {
  try {
    const { blocker_id, lat, lng } = req.query;
    const viewer =
      lat !== undefined && lng !== undefined
        ? { lat: Number(lat), lng: Number(lng) }
        : null;
    const posts = await listActivePosts(req.params.id, blocker_id || null, viewer);
    const withCountdown = posts.map((p) => ({
      ...p,
      countdown: timeRemaining(p.expires_at),
    }));
    return res.json({ posts: withCountdown });
  } catch (error) {
    next(error);
  }
}

export async function createZonePost(req, res, next) {
  try {
    const { title, body, post_type, ttlHours, author_id, radius_m } = req.body ?? {};

    if (typeof title !== "string" || !title.trim() || typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ error: "Title and body are required." });
    }
    if (typeof author_id !== "string" || !author_id) {
      return res.status(400).json({ error: "author_id is required (your profile id)." });
    }
    if (!(await getZoneById(req.params.id))) {
      return res.status(404).json({ error: "Zone not found on server — reselect your zone and retry." });
    }
    if (radius_m !== undefined && radius_m !== null) {
      const n = Number(radius_m);
      if (!Number.isFinite(n) || n < 10 || n > 5000) {
        return res.status(400).json({ error: "radius_m must be between 10 and 5000 meters, or omitted for whole-zone." });
      }
    }

    const post = await createPost({
      zone_id: req.params.id,
      author_id,
      title,
      body,
      post_type: post_type || "general",
      ttlHours,
      radiusM: radius_m ?? null,
    });

    return res.status(201).json({
      post: { ...post, countdown: timeRemaining(post.expires_at) },
    });
  } catch (error) {
    // FK errors -> say exactly which id is unknown.
    if (error?.code === "23503") {
      const detail = error?.details || "";
      const which = detail.includes("zone_id") ? "zone" : "author profile";
      return res.status(400).json({
        error:
          which === "zone"
            ? "Unknown zone — reselect your zone and retry."
            : "Your login has no backend profile yet — sign out and sign in again to link it, then retry.",
      });
    }
    next(error);
  }
}

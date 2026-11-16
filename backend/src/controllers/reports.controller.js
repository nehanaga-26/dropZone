import { createReport } from "../services/moderation.service.js";

export async function reportPost(req, res, next) {
  try {
    const { post_id, reporter_id, reason } = req.body ?? {};
    if (!post_id || !reporter_id) {
      return res.status(400).json({ error: "post_id and reporter_id are required." });
    }
    const report = await createReport({ post_id, reporter_id, reason });
    return res.status(201).json({ report });
  } catch (error) {
    if (error?.code === "23503") {
      return res.status(400).json({ error: "Invalid post_id or reporter_id." });
    }
    next(error);
  }
}

import { listPendingReports, reviewReport } from "../services/moderation.service.js";

export async function getQueue(_req, res, next) {
  try {
    const reports = await listPendingReports();
    return res.json({ reports });
  } catch (error) {
    next(error);
  }
}

export async function review(req, res, next) {
  try {
    // Simple server-side moderator check: must send header x-role: moderator
    if (req.headers["x-role"] !== "moderator") {
      return res.status(403).json({ error: "Moderator only. Send header x-role: moderator" });
    }
    const { action } = req.body ?? {};
    const result = await reviewReport(req.params.id, action);
    return res.json({ report: result });
  } catch (error) {
    if (error.message === "Report not found") {
      return res.status(404).json({ error: "Report not found" });
    }
    if (error.message.startsWith("action must be")) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

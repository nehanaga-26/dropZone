import {
  listActiveAlerts,
  createAlert,
  declareVisit,
  clearVisits,
  hideAlert,
} from "../services/alerts.service.js";
import { timeRemaining } from "../utils/expiry.js";

// GET /api/zones/:id/alerts — PUBLIC (visitors see before entering).
export async function getZoneAlerts(req, res, next) {
  try {
    const alerts = await listActiveAlerts(req.params.id);
    return res.json({
      alerts: alerts.map((a) => ({ ...a, countdown: timeRemaining(a.expires_at) })),
    });
  } catch (error) {
    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return res.status(500).json({
        error: "security_alerts table missing. Run the M-extra SQL in Supabase dashboard.",
      });
    }
    next(error);
  }
}

// POST /api/zones/:id/alerts — anyone in that locality can warn others.
export async function createZoneAlert(req, res, next) {
  try {
    const { title, body, severity, ttlHours, author_id } = req.body ?? {};
    if (typeof title !== "string" || !title.trim() || typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ error: "Title and details are required." });
    }
    if (!author_id) {
      return res.status(400).json({ error: "author_id is required." });
    }
    const alert = await createAlert({
      zone_id: req.params.id,
      author_id,
      title,
      body,
      severity,
      ttlHours,
    });
    return res.status(201).json({ alert: { ...alert, countdown: timeRemaining(alert.expires_at) } });
  } catch (error) {
    if (error?.code === "23503") {
      return res.status(400).json({ error: "Invalid zone_id or author_id." });
    }
    next(error);
  }
}

// POST /api/zones/:id/visits — "I am visiting this locality on this date".
export async function postVisit(req, res, next) {
  try {
    const { author_id, visit_date } = req.body ?? {};
    if (!author_id) return res.status(400).json({ error: "author_id is required." });
    const visit = await declareVisit({ zone_id: req.params.id, author_id, visit_date });
    const alerts = await listActiveAlerts(req.params.id);
    return res.status(201).json({
      visit,
      message: `Visit saved. ${alerts.length} active alert(s) for this locality — read before you travel.`,
      alerts: alerts.map((a) => ({ ...a, countdown: timeRemaining(a.expires_at) })),
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/zones/:id/visits — leaving wipes your visit declarations.
export async function deleteVisit(req, res, next) {
  try {
    const { author_id } = req.body ?? {};
    if (!author_id) return res.status(400).json({ error: "author_id is required." });
    const removed = await clearVisits({ zone_id: req.params.id, author_id });
    return res.json({ removed, message: "Your visit data for this zone was deleted." });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/zones/:id/alerts/:alertId — moderator only.
export async function removeAlert(req, res, next) {
  try {
    if (req.headers["x-role"] !== "moderator") {
      return res.status(403).json({ error: "Moderator only. Send header x-role: moderator" });
    }
    await hideAlert(req.params.alertId);
    return res.json({ removed: true });
  } catch (error) {
    next(error);
  }
}

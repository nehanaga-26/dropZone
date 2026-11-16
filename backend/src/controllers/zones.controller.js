import { listZones, getZoneById, createZoneRow } from "../services/zones.service.js";
import { checkMembership } from "../utils/geofence.js";
import { countActiveAlerts } from "../services/alerts.service.js";

export async function getZones(_req, res, next) {
  try {
    const zones = await listZones();
    return res.json({ zones });
  } catch (error) {
    next(error);
  }
}

// POST /api/zones  body: { name, description }
export async function createZone(req, res, next) {
  try {
    const { name, description } = req.body ?? {};
    if (typeof name !== "string" || name.trim().length < 3) {
      return res.status(400).json({ error: "Zone name must be at least 3 characters." });
    }
    const zone = await createZoneRow({
      name: name.trim().slice(0, 120),
      description: typeof description === "string" ? description.trim().slice(0, 500) : "",
    });
    return res.status(201).json({ zone });
  } catch (error) {
    next(error);
  }
}

// POST /api/zones/:id/check  body: { lat, lng, accuracy, useTestMode }
export async function checkZone(req, res, next) {
  try {
    const zone = await getZoneById(req.params.id);
    if (!zone) return res.status(404).json({ error: "Zone not found" });

    const { lat, lng, accuracy, useTestMode } = req.body ?? {};
    const result = checkMembership({
      zoneName: zone.name,
      lat,
      lng,
      accuracy,
      useTestMode,
    });

    return res.json({
      zoneId: zone.id,
      zoneName: zone.name,
      ...result,
      activeAlerts: await countActiveAlerts(zone.id).catch(() => 0),
    });
  } catch (error) {
    next(error);
  }
}

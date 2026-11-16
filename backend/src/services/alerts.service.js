import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { calcExpiresAt } from "../utils/expiry.js";

const SEV = new Set(["info", "warning", "critical"]);

export function normalizeSeverity(s) {
  if (SEV.has(s)) return s;
  return "warning";
}

// Active alerts only: expires_at > now(), critical first.
export async function listActiveAlerts(zoneId) {
  const { data, error } = await supabaseAdmin
    .from("security_alerts")
    .select("id, zone_id, author_id, title, body, severity, expires_at, created_at")
    .eq("zone_id", zoneId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rank = { critical: 0, warning: 1, info: 2 };
  return (data ?? []).sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9));
}

export async function countActiveAlerts(zoneId) {
  const { count, error } = await supabaseAdmin
    .from("security_alerts")
    .select("id", { count: "exact", head: true })
    .eq("zone_id", zoneId)
    .gt("expires_at", new Date().toISOString());
  if (error) return 0;
  return count ?? 0;
}

export async function createAlert({ zone_id, author_id, title, body, severity, ttlHours }) {
  const { data, error } = await supabaseAdmin
    .from("security_alerts")
    .insert({
      zone_id,
      author_id,
      title: title.trim(),
      body: body.trim(),
      severity: normalizeSeverity(severity),
      expires_at: calcExpiresAt(ttlHours ?? 24),
    })
    .select("id, zone_id, author_id, title, body, severity, expires_at, created_at")
    .single();
  if (error) throw error;
  return data;
}

// Visitor declares a visit: upsert (author, zone, date).
export async function declareVisit({ zone_id, author_id, visit_date }) {
  const row = {
    zone_id,
    author_id,
    visit_date: visit_date || new Date().toISOString().slice(0, 10),
  };
  const { data, error } = await supabaseAdmin
    .from("zone_visits")
    .upsert(row, { onConflict: "author_id,zone_id,visit_date" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function clearVisits({ zone_id, author_id }) {
  const { data, error } = await supabaseAdmin
    .from("zone_visits")
    .delete()
    .eq("zone_id", zone_id)
    .eq("author_id", author_id)
    .select("author_id");
  if (error) throw error;
  return (data ?? []).length;
}

export async function hideAlert(alertId) {
  const { error } = await supabaseAdmin
    .from("security_alerts")
    .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
    .eq("id", alertId);
  if (error) throw error;
  return true;
}

import { supabaseAdmin } from "../lib/supabaseAdmin.js";

export async function createReport({ post_id, reporter_id, reason }) {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .insert({ post_id, reporter_id, reason: (reason || "reported").trim().slice(0, 500) })
    .select("id, reporter_id, post_id, reason, status, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function listPendingReports() {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("id, reporter_id, post_id, reason, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// action: "retain" (keep post) or "remove" (hide post by expiring it).
// Remove = set expires_at to past so feed hides it, audit row in reports survives.
// (Deleting the post row would cascade-delete the report audit row.)
export async function reviewReport(reportId, action) {
  if (!["retain", "remove"].includes(action)) {
    throw new Error("action must be retain or remove");
  }

  const { data: report, error: fetchErr } = await supabaseAdmin
    .from("reports")
    .select("id, post_id, status")
    .eq("id", reportId)
    .single();
  if (fetchErr || !report) throw new Error("Report not found");

  if (action === "remove") {
    await supabaseAdmin
      .from("posts")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("id", report.post_id);
  }

  const newStatus = action === "remove" ? "actioned" : "dismissed";
  const { data, error } = await supabaseAdmin
    .from("reports")
    .update({ status: newStatus })
    .eq("id", reportId)
    .select("id, reporter_id, post_id, reason, status, created_at")
    .single();
  if (error) throw error;
  return data;
}

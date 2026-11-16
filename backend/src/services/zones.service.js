import { supabaseAdmin } from "../lib/supabaseAdmin.js";

export async function listZones() {
  const { data, error } = await supabaseAdmin
    .from("zones")
    .select("id, name, description, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getZoneById(id) {
  const { data, error } = await supabaseAdmin
    .from("zones")
    .select("id, name, description, created_at")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function createZoneRow({ name, description }) {
  const { data, error } = await supabaseAdmin
    .from("zones")
    .insert({ name, description })
    .select("id, name, description, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function ensureSeedZones() {
  const existing = await listZones();
  if (existing.length > 0) return existing;

  const seeds = [
    {
      name: "VIIT Campus - Test Zone",
      description: "Test Zone (simulated) - Vignan's Institute, Campus area. Always labelled simulated.",
    },
    {
      name: "Samartha Hackathon Hall - Test Zone",
      description: "Test Zone (simulated) - Hackathon venue. Always labelled simulated.",
    },
  ];

  const { data, error } = await supabaseAdmin
    .from("zones")
    .insert(seeds)
    .select("id, name, description, created_at");

  if (error) throw error;
  return data ?? [];
}

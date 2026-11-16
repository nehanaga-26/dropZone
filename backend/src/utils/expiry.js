// Expiry helpers - server is source of truth, not UI.
export function calcExpiresAt(ttlHours = 24) {
  const h = Math.min(Math.max(Number(ttlHours) || 24, 1), 72);
  return new Date(Date.now() + h * 3600 * 1000).toISOString();
}

export function isExpired(expires_at) {
  return new Date(expires_at).getTime() <= Date.now();
}

export function timeRemaining(expires_at) {
  const ms = new Date(expires_at).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `Expires in ${h}h ${m}m`;
  return `Expires in ${m}m`;
}

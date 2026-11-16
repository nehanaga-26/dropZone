/**
 * Minimal backend client for M1 (zones + geofence check).
 * Matches backend/src/routes/zones.routes.js. Throws Error with the
 * server's message on any non-2xx response.
 */

export const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:3000';

/** Demo profile id — must exist in backend `profiles`. */
export const BACKEND_DEMO_AUTHOR_ID = '698ca5b3-20b6-4f6a-a702-0b3c3f3d38a2';

/** Session access token for authenticated writes (null when signed out). */
async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { getSupabaseClient } = await import('../supabase/client');
    const { data } = await getSupabaseClient().auth.getSession();
    const t = data.session?.access_token;
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()), ...(opts.headers || {}) },
      signal: ctrl.signal,
      ...opts,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export interface BackendZone {
  id: string;
  name: string;
  description: string;
  created_at: string;
}
export interface BackendPost {
  id: string;
  zone_id: string;
  author_id: string;
  title: string;
  body: string;
  post_type: string;
  radius_m: number | null;
  expires_at: string;
  created_at: string;
  countdown?: string;
}
export interface BackendAlert {
  id: string;
  zone_id: string;
  author_id: string;
  title: string;
  body: string;
  severity: string;
  expires_at: string;
  created_at: string;
  countdown?: string;
}
export interface ZoneCheck {
  zoneId: string;
  zoneName: string;
  inZone: boolean;
  mode: string;
  distanceM?: number;
  radiusM?: number;
  retry?: boolean;
  reason?: string;
  activeAlerts?: number;
}

export const api = {
  health: async (): Promise<boolean> => {
    try {
      await req('/health');
      return true;
    } catch {
      return false;
    }
  },
  listZones: () => req<{ zones: BackendZone[] }>('/api/zones'),
  checkZone: (zoneId: string, body: object) =>
    req<ZoneCheck>(`/api/zones/${zoneId}/check`, { method: 'POST', body: JSON.stringify(body) }),
  listPosts: (zoneId: string, blockerId?: string, loc?: { lat: number; lng: number }) => {
    const q = new URLSearchParams();
    if (blockerId) q.set('blocker_id', blockerId);
    if (loc) {
      q.set('lat', String(loc.lat));
      q.set('lng', String(loc.lng));
    }
    const qs = q.toString() ? `?${q.toString()}` : '';
    return req<{ posts: BackendPost[] }>(`/api/zones/${zoneId}/posts${qs}`);
  },
  createPost: (zoneId: string, body: object) =>
    req<{ post: BackendPost }>(`/api/zones/${zoneId}/posts`, { method: 'POST', body: JSON.stringify(body) }),
  reportPost: (body: object) =>
    req<{ report: { id: string } }>('/api/reports', { method: 'POST', body: JSON.stringify(body) }),
  modQueue: () =>
    req<{ reports: Array<{ id: string; reporter_id: string; post_id: string; reason: string; status: string; created_at: string }> }>('/api/moderation/queue'),
  modReview: (id: string, action: 'retain' | 'remove') =>
    req<{ report: { id: string; status: string } }>(`/api/moderation/${id}/review`, {
      method: 'POST',
      headers: { 'x-role': 'moderator' },
      body: JSON.stringify({ action }),
    }),
  blockUser: (blocker_id: string, blocked_id: string) =>
    req('/api/blocks', { method: 'POST', body: JSON.stringify({ blocker_id, blocked_id }) }),
  listBlocks: (blocker_id: string) =>
    req<{ blocked: { blocked_id: string }[] }>(`/api/blocks?blocker_id=${blocker_id}`),
  unblockUser: (blocker_id: string, blocked_id: string) =>
    req('/api/blocks', { method: 'DELETE', body: JSON.stringify({ blocker_id, blocked_id }) }),
  listAlerts: (zoneId: string) => req<{ alerts: BackendAlert[] }>(`/api/zones/${zoneId}/alerts`),
  createAlert: (zoneId: string, body: object) =>
    req<{ alert: BackendAlert }>(`/api/zones/${zoneId}/alerts`, { method: 'POST', body: JSON.stringify(body) }),
  declareVisit: (zoneId: string, body: object) =>
    req<{ visit: object; message: string; alerts: BackendAlert[] }>(`/api/zones/${zoneId}/visits`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  removeAlert: (zoneId: string, alertId: string) =>
    req(`/api/zones/${zoneId}/alerts/${alertId}`, { method: 'DELETE', headers: { 'x-role': 'moderator' } }),
  profilesEnsure: (id: string, username: string) =>
    req<{ profile: { id: string; username: string } }>('/api/profiles/ensure', {
      method: 'POST',
      body: JSON.stringify({ id, username }),
    }),
};

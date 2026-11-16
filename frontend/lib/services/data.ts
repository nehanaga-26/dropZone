/**
 * M1 geofence facade: backend-first, mock fallback.
 * Feed access is granted only on the server's inZone verdict.
 */
import { api, API_BASE, BACKEND_DEMO_AUTHOR_ID } from '../api/client';
import { mapZone } from '../api/mapper';
import { dropZoneService } from './postService';
import type { Zone } from '../types';

export const USE_BACKEND =
  typeof process === 'undefined' || process.env.NEXT_PUBLIC_USE_BACKEND !== '0';

let backendOk: boolean | null = null;
export async function isBackendOn(): Promise<boolean> {
  if (!USE_BACKEND) return false;
  if (backendOk === null) backendOk = await api.health();
  return backendOk;
}

/**
 * Only network failures and 5xx mean "backend is down" (→ mock fallback).
 * 4xx (validation, rate limit, auth) are real answers — rethrow them so the
 * UI shows the true message instead of a confusing mock error.
 */
function serverDown(e: unknown): boolean {
  const s = (e as { status?: number })?.status;
  return s === undefined || s >= 500;
}

/** True only when the request never reached the server (offline/DNS). */
function noResponse(e: unknown): boolean {
  return (e as { status?: number })?.status === undefined;
}

export async function listZones(): Promise<Zone[]> {
  if (await isBackendOn()) {
    try {
      return (await api.listZones()).zones.map(mapZone);
    } catch (e) {
      if (!serverDown(e)) throw e;
      backendOk = false;
    }
  }
  return dropZoneService.listZones(true);
}

export interface Membership {
  inZone: boolean;
  mode: string;
  distanceM?: number;
  radiusM?: number;
  retry?: boolean;
  reason?: string;
  activeAlerts?: number;
  zoneName?: string;
}

/** Test-mode (simulated) by default; pass GPS coords for a real haversine verdict. */
export async function checkZone(
  zoneId: string,
  zoneName: string,
  gps?: { lat: number; lng: number; accuracy?: number }
): Promise<Membership> {
  if (await isBackendOn()) {
    try {
      const r = await api.checkZone(zoneId, gps ? { ...gps, useTestMode: false } : { useTestMode: true });
      return { ...r, zoneName: r.zoneName || zoneName };
    } catch (e) {
      if (!serverDown(e)) throw e instanceof Error ? e : new Error('Zone check failed');
      backendOk = false;
      throw e instanceof Error ? e : new Error('Zone check failed');
    }
  }
  return { inZone: true, mode: 'mock (offline)', zoneName };
}

/**
 * Who is acting? Signed-in Supabase user id (profile ensured server-side),
 * else the shared demo profile so persona mode keeps working offline.
 */
export async function sessionAuthorId(): Promise<string> {
  try {
    const { getSupabaseClient } = await import('../supabase/client');
    const { data } = await getSupabaseClient().auth.getSession();
    const u = data.session?.user;
    if (u) {
      const username = (u.email || `user_${u.id.slice(0, 8)}`).split('@')[0].slice(0, 60);
      await api.profilesEnsure(u.id, username).catch(() => null);
      return u.id;
    }
  } catch {
    /* offline */
  }
  return BACKEND_DEMO_AUTHOR_ID;
}

function applyFilters(
  posts: import('../types').Post[],
  category?: import('../types').PostCategory,
  filters?: import('../types').SearchFilters
): import('../types').Post[] {
  let out = posts;
  const cat = filters?.category && filters.category !== 'all' ? filters.category : category;
  if (cat && (cat as string) !== 'all') out = out.filter((p) => p.category === cat);
  if (filters?.lostFoundFilter && filters.lostFoundFilter !== 'all')
    out = out.filter((p) => p.metadata?.itemType === filters.lostFoundFilter);
  if (filters?.itemStatusFilter && filters.itemStatusFilter !== 'all')
    out = out.filter((p) => p.metadata?.lostFoundStatus === filters.itemStatusFilter);
  if (filters?.query?.trim()) {
    const q = filters.query.toLowerCase().trim();
    out = out.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }
  return out;
}

export async function listPosts(
  zoneId: string,
  category?: import('../types').PostCategory,
  filters?: import('../types').SearchFilters,
  loc?: { lat: number; lng: number }
): Promise<import('../types').Post[]> {
  const { mapPost } = await import('../api/mapper');
  if (await isBackendOn()) {
    try {
      const d = await api.listPosts(zoneId, await sessionAuthorId(), loc);
      return applyFilters(d.posts.map((p) => mapPost(p)), category, filters);
    } catch (e) {
      if (!serverDown(e)) throw e;
      backendOk = false;
    }
  }
  return dropZoneService.listPosts(zoneId, category, filters);
}

export async function createPost(
  zoneId: string,
  category: import('../types').PostCategory,
  title: string,
  content: string,
  ttlHours: number,
  author: import('../types').UserProfile,
  itemType?: string,
  radiusM?: number | null
): Promise<import('../types').Post> {
  const { mapPost, categoryToPostType } = await import('../api/mapper');
  if (await isBackendOn()) {
    try {
      const d = await api.createPost(zoneId, {
        title,
        body: content,
        post_type: categoryToPostType(category, itemType),
        ttlHours,
        author_id: await sessionAuthorId(),
        ...(typeof radiusM === 'number' ? { radius_m: radiusM } : {}),
      });
      const m = mapPost(d.post, author.displayName);
      m.authorHandle = author.handle;
      m.authorAvatar = author.avatarSeed;
      if (category === 'team_match') m.category = 'team_match';
      return m;
    } catch (e) {
      // Writes never silently fall back to mock data: a posted drop must
      // really exist. Offline → clear message; server answers pass through.
      if (noResponse(e)) {
        backendOk = false;
        throw new Error('Backend unreachable. Start it (cd backend, node server.js) and retry.');
      }
      throw e instanceof Error ? e : new Error('Post failed');
    }
  }
  return dropZoneService.createPost(
    {
      zoneId, category, title, content, ttlHours: ttlHours as 1 | 6 | 12 | 24 | 72,
      ...(typeof radiusM === 'number' ? { metadata: { radiusM } } : {}),
    },
    author
  );
}

export async function reportPost(
  postId: string,
  postTitle: string,
  reason: import('../types').ReportReason,
  notes: string | undefined,
  reporter: import('../types').UserProfile
) {
  const { mapReport } = await import('../api/mapper');
  if (await isBackendOn()) {
    try {
      const r = await api.reportPost({
        post_id: postId,
        reporter_id: await sessionAuthorId(),
        reason: notes ? `${reason}: ${notes}` : reason,
      });
      return {
        report: mapReport(r.report.id, postId, postTitle, reporter.id, reason, notes),
        autoHidden: false,
        totalUniqueReports: 1,
      };
    } catch (e) {
      if (noResponse(e)) {
        backendOk = false;
        throw new Error('Backend unreachable. Start it (cd backend, node server.js) and retry.');
      }
      throw e instanceof Error ? e : new Error('Report failed');
    }
  }
  return dropZoneService.reportPost(postId, postTitle, reason, notes, reporter.id);
}

export async function blockUser(blockedId: string) {
  await api.blockUser(await sessionAuthorId(), blockedId);
}

export async function listBlockedIds(): Promise<string[]> {
  return (await api.listBlocks(await sessionAuthorId())).blocked.map((x) => x.blocked_id);
}

export async function unblockUser(blockedId: string) {
  await api.unblockUser(await sessionAuthorId(), blockedId);
}

function toAlert(a: {
  id: string;
  zone_id: string;
  title: string;
  body: string;
  severity: string;
  created_at: string;
  expires_at: string;
  countdown?: string;
}): import('../types').SecurityAlert {
  const severity = a.severity === 'critical' || a.severity === 'warning' || a.severity === 'info' ? a.severity : 'warning';
  return {
    id: a.id,
    zoneId: a.zone_id,
    title: a.title,
    body: a.body,
    severity: severity as import('../types').AlertSeverity,
    createdAt: a.created_at,
    expiresAt: a.expires_at,
    countdown: a.countdown,
  };
}

export async function listAlerts(zoneId: string): Promise<import('../types').SecurityAlert[]> {
  return (await api.listAlerts(zoneId)).alerts.map(toAlert);
}

export async function createAlert(
  zoneId: string,
  title: string,
  body: string,
  severity: import('../types').AlertSeverity,
  ttlHours: number
): Promise<import('../types').SecurityAlert> {
  const d = await api.createAlert(zoneId, { title, body, severity, ttlHours, author_id: await sessionAuthorId() });
  return toAlert(d.alert);
}

export async function declareVisit(zoneId: string): Promise<{ message: string; alerts: import('../types').SecurityAlert[] }> {
  const d = await api.declareVisit(zoneId, { author_id: await sessionAuthorId() });
  return { message: d.message, alerts: d.alerts.map(toAlert) };
}

export async function removeAlert(zoneId: string, alertId: string): Promise<void> {
  await api.removeAlert(zoneId, alertId);
}

export async function modQueue() {
  return api.modQueue();
}

export async function modReview(id: string, action: 'retain' | 'remove') {
  return api.modReview(id, action);
}

export async function createZone(name: string, description: string): Promise<import('../types').Zone> {
  const { mapZone } = await import('../api/mapper');
  const { API_BASE } = await import('../api/client');
  if (await isBackendOn()) {
    const res = await fetch(`${API_BASE}/api/zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Zone creation failed');
    return mapZone(data.zone);
  }
  const me = dropZoneService.getCurrentUser();
  return dropZoneService.createZone({ name, description, radiusMeters: 250, durationPreset: '12h' }, me);
}

/**
 * Leaving wipes YOUR data for the zone: visit declarations on the server.
 * (Posts/alerts are shared community data — your device drops its copies;
 * the server never stores your location or per-user feed state.)
 */
export async function leaveZoneCleanup(zoneId: string): Promise<number> {
  try {
    const author_id = await sessionAuthorId();
    const res = await fetch(`${API_BASE}/api/zones/${zoneId}/visits`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_id }),
    });
    const data = await res.json().catch(() => ({}));
    return typeof data.removed === 'number' ? data.removed : 0;
  } catch {
    return 0;
  }
}


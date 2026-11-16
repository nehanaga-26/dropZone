/**
 * Zone mapping + client haversine (instant preview only).
 * Mirrors backend DEMO_CENTERS in backend/src/utils/geofence.js.
 * The server verdict is authoritative for feed access.
 */
import type { Zone } from '../types';
import type { BackendZone, BackendPost } from './client';

export const GEO: Record<string, { lat: number; lng: number; radiusM: number }> = {
  'VIIT Campus - Test Zone': { lat: 17.6868, lng: 83.2185, radiusM: 500 },
  'Samartha Hackathon Hall - Test Zone': { lat: 17.6875, lng: 83.219, radiusM: 200 },
  'CSE Block - Test Zone': { lat: 17.687, lng: 83.218, radiusM: 300 },
  'Central Library - Test Zone': { lat: 17.686, lng: 83.219, radiusM: 200 },
  'Canteen - Test Zone': { lat: 17.6855, lng: 83.218, radiusM: 150 },
  'Playground - Test Zone': { lat: 17.688, lng: 83.217, radiusM: 400 },
  'Seminar Hall - Test Zone': { lat: 17.6872, lng: 83.2195, radiusM: 150 },
};
const FALLBACK_GEO = { lat: 12.9716, lng: 77.5946, radiusM: 250 };
export const geoFor = (zoneName: string) => GEO[zoneName] || FALLBACK_GEO;

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const t = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(t(lat2 - lat1) / 2) ** 2 +
    Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(t(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function mapZone(bz: BackendZone): Zone {
  const g = geoFor(bz.name);
  return {
    id: bz.id,
    name: bz.name,
    description: bz.description || '',
    tagline: (bz.description || '').slice(0, 80) || 'Backend community zone',
    type: 'circle',
    centerLat: g.lat,
    centerLng: g.lng,
    radiusMeters: g.radiusM,
    ownerId: 'backend',
    ownerName: 'Backend',
    createdAt: bz.created_at,
    updatedAt: bz.created_at,
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    status: 'active',
    isTestZone: /test|simulat/i.test(`${bz.name} ${bz.description || ''}`),
    activeUserCount: 0,
    colorScheme: 'cyan',
  };
}

export function categoryToPostType(category: import('../types').PostCategory, itemType?: string): string {
  if (category === 'lost_found') return itemType === 'found' ? 'found' : 'lost';
  if (category === 'feed') return 'announcement';
  return 'general';
}

export function postTypeToCategory(pt: string): import('../types').PostCategory {
  return pt === 'lost' || pt === 'found' ? 'lost_found' : 'feed';
}

export function mapPost(bp: BackendPost, authorName = 'Campus member'): import('../types').Post {
  const category = postTypeToCategory(bp.post_type);
  const ttlHours = Math.max(1, Math.round((+new Date(bp.expires_at) - +new Date(bp.created_at)) / 3600000));
  return {
    id: bp.id,
    zoneId: bp.zone_id,
    authorId: bp.author_id,
    authorName,
    authorHandle: '@backend',
    authorAvatar: 'backend',
    category,
    title: bp.title,
    content: bp.body,
    ttlHours: ttlHours as import('../types').Post['ttlHours'],
    createdAt: bp.created_at,
    expiresAt: bp.expires_at,
    isRemoved: false,
    reportCount: 0,
    uniqueReporters: [],
    moderationStatus: 'normal',
    commentCount: 0,
    metadata: {
      ...(category === 'lost_found' ? { itemType: bp.post_type === 'found' ? ('found' as const) : ('lost' as const) } : {}),
      ...(typeof bp.radius_m === 'number' ? { radiusM: bp.radius_m } : {}),
    },
  };
}

export function mapReport(
  id: string,
  postId: string,
  postTitle: string,
  reporterId: string,
  reason: string,
  notes?: string
): import('../types').Report {
  const ok = ['spam', 'harassment', 'inappropriate', 'privacy_violation', 'other'].includes(reason);
  return {
    id, postId, postTitle, reporterId,
    reason: (ok ? reason : 'other') as import('../types').ReportReason,
    notes, createdAt: new Date().toISOString(), status: 'pending',
  };
}

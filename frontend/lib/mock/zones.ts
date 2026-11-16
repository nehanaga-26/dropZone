import { Zone } from '../types';

const now = new Date();
const hoursFromNow = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

export const MOCK_ZONES: Zone[] = [
  {
    id: 'zone-hackathon-arena',
    name: 'Hackathon Arena',
    description: 'Main event floor, hacking bays, mentor booths, and stage presentation area.',
    tagline: 'High-energy hub for builders & teams',
    type: 'circle',
    centerLat: 12.9716,
    centerLng: 77.5946,
    radiusMeters: 250,
    ownerId: 'usr-student-dev',
    ownerName: 'Alex Rivers',
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(1),
    expiresAt: hoursFromNow(36), // active for 36 hours
    status: 'active',
    isTestZone: true,
    activeUserCount: 84,
    colorScheme: 'cyan',
    coverImage: '/campus_hero_banner.jpg',
  },
  {
    id: 'zone-college-library',
    name: 'College Library',
    description: 'Quiet study wings, reference archives, seminar rooms, and project discussion tables.',
    tagline: 'Focused study & resource zone',
    type: 'circle',
    centerLat: 12.9725,
    centerLng: 77.5958,
    radiusMeters: 200,
    ownerId: 'usr-student-dev',
    ownerName: 'Alex Rivers',
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(2),
    expiresAt: hoursFromNow(16),
    status: 'active',
    isTestZone: true,
    activeUserCount: 42,
    colorScheme: 'blue',
  },
  {
    id: 'zone-tech-quad',
    name: 'Tech Quad',
    description: 'Open courtyard, food stalls, lawn networking circle, and robotics test grounds.',
    tagline: 'Outdoor networking & casual meetups',
    type: 'circle',
    centerLat: 12.9708,
    centerLng: 77.5932,
    radiusMeters: 300,
    ownerId: 'usr-jordan-mod',
    ownerName: 'Jordan Lee',
    createdAt: hoursAgo(12),
    updatedAt: hoursAgo(3),
    expiresAt: hoursFromNow(24),
    status: 'active',
    isTestZone: true,
    activeUserCount: 65,
    colorScheme: 'emerald',
  },
];

export const DEFAULT_ZONE_ID = 'zone-hackathon-arena';

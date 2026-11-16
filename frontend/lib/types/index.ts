/**
 * DropZone Core Types
 * Complete data models for Zone Management, Social Posts, Comments,
 * Private Lost & Found Claims, Moderation, and In-App Notifications.
 */

export type ZoneType = 'circle' | 'polygon';
export type ZoneStatus = 'active' | 'expired' | 'deactivated';
export type ZoneRole = 'owner' | 'moderator' | 'member' | 'visitor';
export type ZoneDurationPreset = '1h' | '12h' | '3d' | 'custom';

export interface Zone {
  id: string;
  name: string;
  description: string;
  tagline: string;
  type: ZoneType;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  ownerId: string;
  ownerName: string;
  coverImage?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  status: ZoneStatus;
  isTestZone: boolean;
  activeUserCount: number;
  colorScheme: 'cyan' | 'blue' | 'emerald';
}

export type ZoneAuditAction =
  | 'create'
  | 'edit'
  | 'radius_change'
  | 'extend'
  | 'deactivate'
  | 'reactivate'
  | 'expire'
  | 'permissions_change';

export interface ZoneAuditRecord {
  id: string;
  zoneId: string;
  actorId: string;
  actorName?: string;
  action: ZoneAuditAction | string;
  description?: string;
  summary?: string;
  timestamp: string;
}

export interface ZoneMembership {
  zoneId: string;
  userId: string;
  role: ZoneRole;
  joinedAt: string;
}

export type PostCategory = 'feed' | 'lost_found' | 'team_match';
export type TTLHours = 1 | 6 | 12 | 24 | 72;

export type LostFoundItemStatus = 'lost' | 'found' | 'claim_pending' | 'returned' | 'closed';

export interface Post {
  id: string;
  zoneId: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  category: PostCategory;
  title: string;
  content: string;
  ttlHours: TTLHours;
  createdAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  isRemoved: boolean;
  tags?: string[];
  reportCount: number;
  uniqueReporters: string[];
  moderationStatus: 'normal' | 'pending_moderator_review' | 'removed';
  commentCount: number;
  metadata?: {
    itemType?: 'lost' | 'found';
    contactHint?: string;
    skillsNeeded?: string[];
    teamSize?: string;
    itemStatus?: LostFoundItemStatus;
    lostFoundStatus?: LostFoundItemStatus;
    activeClaimId?: string;
    imageUrl?: string;
    radiusM?: number;
  };
  updatedAt?: string; // ISO 8601
}

export interface EditPostInput {
  title?: string;
  content?: string;
  tags?: string[];
  metadata?: Post['metadata'];
}

export interface Comment {
  id: string;
  postId: string;
  zoneId: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  name?: string;
  handle: string;
  avatarSeed: string;
  isModerator: boolean;
  roleTitle?: string;
}

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'privacy_violation'
  | 'other';

export interface Report {
  id: string;
  postId: string;
  postTitle: string;
  reporterId: string;
  reason: ReportReason;
  notes?: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'dismissed';
}

export interface ModerationActionRecord {
  id: string;
  postId: string;
  postTitle: string;
  action: 'auto_hidden_10_reports' | 'confirmed_removed' | 'restored' | 'dismissed';
  moderatorId?: string;
  moderatorName?: string;
  reason: string;
  createdAt: string;
}

export type ClaimStatus = 'claim_pending' | 'pending' | 'approved' | 'rejected' | 'returned' | 'closed';

export interface ClaimEvidenceAttachment {
  fileName: string;
  fileType: string;
  dataUrl?: string;
}

export interface ClaimMessage {
  id: string;
  claimId: string;
  senderId: string;
  senderName: string;
  content: string;
  attachment?: ClaimEvidenceAttachment;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

export interface LostFoundClaim {
  id: string;
  postId: string;
  zoneId: string;
  itemTitle: string;
  claimantId: string;
  claimantName: string;
  claimantHandle?: string;
  finderId: string;
  finderName: string;
  status: ClaimStatus;
  claimNotes?: string;
  evidenceAttachment?: ClaimEvidenceAttachment;
  messages: ClaimMessage[];
  createdAt: string;
  updatedAt: string;
  decisionTimestamp?: string;
  returnTimestamp?: string;
}

export type NotificationType =
  | 'comment'
  | 'new_comment'
  | 'claim_new'
  | 'new_claim'
  | 'claim_message'
  | 'claim_evidence'
  | 'claim_decision'
  | 'item_status'
  | 'item_status_change'
  | 'zone_expiry'
  | 'zone_expiry_warning'
  | 'zone_expired'
  | 'moderation';

export interface InAppNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityId?: string;
  entityType?: 'post' | 'claim' | 'zone';
  createdAt: string;
  readAt?: string;
}

export interface CreatePostInput {
  zoneId: string;
  category: PostCategory;
  title: string;
  content: string;
  ttlHours: TTLHours;
  tags?: string[];
  metadata?: Post['metadata'];
  /** Visible radius in meters from zone centre (10–5000). Omit = whole zone. */
  radiusM?: number | null;
}

export interface CreateZoneInput {
  name: string;
  description: string;
  tagline?: string;
  coverImage?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  centerLat?: number;
  centerLng?: number;
  radiusMeters: number;
  durationPreset: ZoneDurationPreset;
  customDurationValue?: number;
  customDurationUnit?: 'minutes' | 'hours' | 'days';
  customMinutes?: number;
}

export interface EditZoneInput {
  name: string;
  description: string;
  tagline?: string;
  coverImage?: string;
  radiusMeters: number;
}

export interface ExtendZoneInput {
  extensionPreset?: '3h' | '12h' | '1d';
  customNewExpiresAt?: string;
}

export interface SearchFilters {
  query?: string;
  category?: PostCategory | 'all';
  itemStatus?: string;
  lostFoundFilter?: 'all' | 'lost' | 'found';
  itemStatusFilter?: 'all' | LostFoundItemStatus;
}

// Security alerts (backend-powered): residents + visitors see these
// before entering. Separate from the social feed by design.
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface SecurityAlert {
  id: string;
  zoneId: string;
  title: string;
  body: string;
  severity: AlertSeverity;
  createdAt: string;
  expiresAt: string;
  countdown?: string;
}

export interface CreateAlertInput {
  zoneId: string;
  title: string;
  body: string;
  severity: AlertSeverity;
  ttlHours: number;
}

export interface ZoneVisit {
  author_id: string;
  zone_id: string;
  visit_date: string;
  created_at?: string;
}

import {
  Post,
  PostCategory,
  CreatePostInput,
  Report,
  ReportReason,
  UserProfile,
  Zone,
  CreateZoneInput,
  EditZoneInput,
  ZoneAuditRecord,
  ZoneRole,
  Comment,
  LostFoundClaim,
  ClaimMessage,
  ClaimStatus,
  ClaimEvidenceAttachment,
  InAppNotification,
  SearchFilters,
  ModerationActionRecord,
  NotificationType,
  ExtendZoneInput,
  EditPostInput,
} from '../types';
import {
  INITIAL_MOCK_POSTS,
  CURRENT_USER,
  INITIAL_MOCK_COMMENTS,
  INITIAL_MOCK_NOTIFICATIONS,
  SIMULATED_USERS,
} from '../mock/posts';
import { MOCK_ZONES } from '../mock/zones';

/**
 * DropZone Mock Persistence & Business Logic Layer
 * Fully encapsulates zone lifecycle, roles, comments, private claims,
 * 10-report auto-hiding threshold, moderation audit, and notifications.
 */

class DropZoneService {
  private zones: Zone[] = [];
  private zoneAuditLogs: ZoneAuditRecord[] = [];
  private posts: Post[] = [];
  private comments: Comment[] = [];
  private reports: Report[] = [];
  private moderationActionLogs: ModerationActionRecord[] = [];
  private claims: LostFoundClaim[] = [];
  private claimMessages: ClaimMessage[] = [];
  private notifications: InAppNotification[] = [];
  private currentUser: UserProfile = CURRENT_USER;
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;

    if (typeof window !== 'undefined') {
      try {
        const storedZones = localStorage.getItem('dropzone_mock_zones_v2');
        const storedAudit = localStorage.getItem('dropzone_mock_zone_audit_v2');
        const storedPosts = localStorage.getItem('dropzone_mock_posts_v2');
        const storedComments = localStorage.getItem('dropzone_mock_comments_v2');
        const storedReports = localStorage.getItem('dropzone_mock_reports_v2');
        const storedModLogs = localStorage.getItem('dropzone_mock_mod_logs_v2');
        const storedClaims = localStorage.getItem('dropzone_mock_claims_v2');
        const storedMessages = localStorage.getItem('dropzone_mock_claim_messages_v2');
        const storedNotifs = localStorage.getItem('dropzone_mock_notifs_v2');
        const storedUser = localStorage.getItem('dropzone_mock_active_user_v2');

        this.zones = storedZones ? JSON.parse(storedZones) : [...MOCK_ZONES];
        this.zoneAuditLogs = storedAudit ? JSON.parse(storedAudit) : [];
        this.posts = storedPosts ? JSON.parse(storedPosts) : [...INITIAL_MOCK_POSTS];
        this.comments = storedComments ? JSON.parse(storedComments) : [...INITIAL_MOCK_COMMENTS];
        this.reports = storedReports ? JSON.parse(storedReports) : [];
        this.moderationActionLogs = storedModLogs ? JSON.parse(storedModLogs) : [];
        this.claims = storedClaims ? JSON.parse(storedClaims) : [];
        this.claimMessages = storedMessages ? JSON.parse(storedMessages) : [];
        this.notifications = storedNotifs ? JSON.parse(storedNotifs) : [...INITIAL_MOCK_NOTIFICATIONS];
        this.currentUser = storedUser ? JSON.parse(storedUser) : CURRENT_USER;

        this.saveAll();
      } catch (e) {
        console.warn('LocalStorage fallback to memory', e);
        this.fallbackInit();
      }
    } else {
      this.fallbackInit();
    }

    this.initialized = true;
  }

  private fallbackInit() {
    this.zones = [...MOCK_ZONES];
    this.zoneAuditLogs = [];
    this.posts = [...INITIAL_MOCK_POSTS];
    this.comments = [...INITIAL_MOCK_COMMENTS];
    this.reports = [];
    this.moderationActionLogs = [];
    this.claims = [];
    this.claimMessages = [];
    this.notifications = [...INITIAL_MOCK_NOTIFICATIONS];
    this.currentUser = CURRENT_USER;
  }

  private saveAll() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('dropzone_mock_zones_v2', JSON.stringify(this.zones));
      localStorage.setItem('dropzone_mock_zone_audit_v2', JSON.stringify(this.zoneAuditLogs));
      localStorage.setItem('dropzone_mock_posts_v2', JSON.stringify(this.posts));
      localStorage.setItem('dropzone_mock_comments_v2', JSON.stringify(this.comments));
      localStorage.setItem('dropzone_mock_reports_v2', JSON.stringify(this.reports));
      localStorage.setItem('dropzone_mock_mod_logs_v2', JSON.stringify(this.moderationActionLogs));
      localStorage.setItem('dropzone_mock_claims_v2', JSON.stringify(this.claims));
      localStorage.setItem('dropzone_mock_claim_messages_v2', JSON.stringify(this.claimMessages));
      localStorage.setItem('dropzone_mock_notifs_v2', JSON.stringify(this.notifications));
      localStorage.setItem('dropzone_mock_active_user_v2', JSON.stringify(this.currentUser));
    } catch (e) {
      console.warn('Could not persist to localStorage', e);
    }
  }

  // ==========================================
  // IDENTITY SIMULATOR (Development Mode)
  // ==========================================
  getCurrentUser(): UserProfile {
    this.init();
    return this.currentUser;
  }

  setCurrentUser(userId: string): UserProfile {
    this.init();
    const found = SIMULATED_USERS.find((u) => u.id === userId);
    if (found) {
      this.currentUser = found;
      this.saveAll();
    }
    return this.currentUser;
  }

  getSimulatedUsers(): UserProfile[] {
    return SIMULATED_USERS;
  }

  // ==========================================
  // ZONE MANAGEMENT (Lifecycle, Expiry, Roles)
  // ==========================================
  async listZones(includeArchived: boolean = false): Promise<Zone[]> {
    this.init();
    const now = Date.now();

    // Check expiration dynamically
    this.zones.forEach((zone) => {
      if (zone.status === 'active' && new Date(zone.expiresAt).getTime() <= now) {
        zone.status = 'expired';
        this.addZoneAudit(
          zone.id,
          'system',
          'System Timer',
          'expire',
          `Zone reached its scheduled expiration time of ${new Date(zone.expiresAt).toLocaleString()}`
        );
      }
    });

    if (includeArchived) {
      return [...this.zones];
    }
    return this.zones.filter((z) => z.status === 'active');
  }

  async getZone(zoneId: string): Promise<Zone | null> {
    this.init();
    await this.listZones(true);
    return this.zones.find((z) => z.id === zoneId) || null;
  }

  getUserZoneRole(zoneId: string, user: UserProfile = this.currentUser): ZoneRole {
    this.init();
    const zone = this.zones.find((z) => z.id === zoneId);
    if (!zone) return 'visitor';
    if (zone.ownerId === user.id) return 'owner';
    if (user.isModerator) return 'moderator';
    if (user.id === 'usr-guest-visitor') return 'visitor';
    return 'member';
  }

  async createZone(input: CreateZoneInput, actor: UserProfile = this.currentUser): Promise<Zone> {
    this.init();

    if (actor.id === 'usr-guest-visitor') {
      throw new Error('Guests cannot create zones. Please switch to an authenticated member or owner persona.');
    }

    if (!input.name || input.name.trim().length < 3) {
      throw new Error('Zone name must be at least 3 characters long.');
    }
    if (input.radiusMeters < 50 || input.radiusMeters > 5000) {
      throw new Error('Zone radius must be between 50 meters and 5,000 meters.');
    }

    // Calculate expiration timestamp
    const now = new Date();
    let durationMinutes = 60; // default 1 hour
    if (input.durationPreset === '1h') durationMinutes = 60;
    else if (input.durationPreset === '12h') durationMinutes = 12 * 60;
    else if (input.durationPreset === '3d') durationMinutes = 3 * 24 * 60;
    else if (input.durationPreset === 'custom') {
      durationMinutes = Math.max(10, input.customMinutes || 60);
    }

    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();
    const zoneId = `zone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newZone: Zone = {
      id: zoneId,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      tagline: input.tagline?.trim() || 'Custom community zone',
      type: 'circle',
      centerLat: input.centerLat || 12.9716,
      centerLng: input.centerLng || 77.5946,
      radiusMeters: input.radiusMeters,
      ownerId: actor.id,
      ownerName: actor.displayName,
      coverImage: input.coverImage || '/campus_hero_banner.jpg',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt,
      status: 'active',
      isTestZone: false,
      activeUserCount: 1,
      colorScheme: 'cyan',
    };

    this.zones.unshift(newZone);
    this.addZoneAudit(
      zoneId,
      actor.id,
      actor.displayName,
      'create',
      `Zone "${newZone.name}" created with radius ${newZone.radiusMeters}m and duration of ${durationMinutes} minutes.`
    );
    this.saveAll();

    return newZone;
  }

  async editZone(zoneId: string, input: EditZoneInput, actor: UserProfile = this.currentUser): Promise<Zone> {
    this.init();
    const zone = this.zones.find((z) => z.id === zoneId);
    if (!zone) throw new Error('Zone not found.');

    const role = this.getUserZoneRole(zoneId, actor);
    if (role !== 'owner' && role !== 'moderator') {
      throw new Error('Unauthorized: Only the zone owner or campus moderators can edit zone parameters.');
    }

    if (input.name.trim().length < 3) {
      throw new Error('Zone name must be at least 3 characters.');
    }
    if (input.radiusMeters < 50 || input.radiusMeters > 5000) {
      throw new Error('Radius must be between 50 and 5,000 meters.');
    }

    const radiusChanged = zone.radiusMeters !== input.radiusMeters;

    zone.name = input.name.trim();
    zone.description = input.description.trim();
    if (input.tagline) zone.tagline = input.tagline.trim();
    if (input.coverImage) zone.coverImage = input.coverImage;
    zone.radiusMeters = input.radiusMeters;
    zone.updatedAt = new Date().toISOString();
    // Expiration timestamp is preserved intact!

    this.addZoneAudit(
      zoneId,
      actor.id,
      actor.displayName,
      radiusChanged ? 'radius_change' : 'edit',
      radiusChanged
        ? `Zone radius updated to ${zone.radiusMeters}m by ${actor.displayName}.`
        : `Zone metadata edited by ${actor.displayName}. Expiration timestamp preserved.`
    );

    this.saveAll();
    return { ...zone };
  }

  getUserRoleInZone(zoneId: string, userId?: string): ZoneRole {
    this.init();
    const user = userId ? SIMULATED_USERS.find((u) => u.id === userId) || this.currentUser : this.currentUser;
    return this.getUserZoneRole(zoneId, user);
  }

  listZoneAuditHistory(zoneId: string): ZoneAuditRecord[] {
    this.init();
    return this.zoneAuditLogs.filter((l) => l.zoneId === zoneId);
  }

  listClaimsForPost(postId: string): LostFoundClaim[] {
    this.init();
    return this.claims.filter((c) => c.postId === postId);
  }

  getPostById(postId: string): Post | null {
    this.init();
    return this.posts.find((p) => p.id === postId) || null;
  }

  async extendZone(
    zoneId: string,
    inputOrHours: ExtendZoneInput | number,
    actor: UserProfile = this.currentUser
  ): Promise<Zone> {
    this.init();
    const zone = this.zones.find((z) => z.id === zoneId);
    if (!zone) throw new Error('Zone not found.');

    const role = this.getUserZoneRole(zoneId, actor);
    if (role !== 'owner' && role !== 'moderator') {
      throw new Error('Unauthorized: Only the zone owner or administrators can extend zone duration.');
    }

    const currentExpiry = new Date(zone.expiresAt).getTime();
    const baseTime = Math.max(Date.now(), currentExpiry);
    let newExpiry: string;
    let descriptionText = '';

    if (typeof inputOrHours === 'number') {
      if (inputOrHours <= 0) {
        throw new Error('Extension duration must be positive.');
      }
      newExpiry = new Date(baseTime + inputOrHours * 60 * 60 * 1000).toISOString();
      descriptionText = `Duration extended by ${inputOrHours} hours to ${new Date(newExpiry).toLocaleString()} by ${actor.displayName}.`;
    } else {
      if (inputOrHours.customNewExpiresAt) {
        const customTime = new Date(inputOrHours.customNewExpiresAt).getTime();
        if (isNaN(customTime) || customTime <= Date.now()) {
          throw new Error('Custom expiration date must be a valid future timestamp.');
        }
        newExpiry = new Date(customTime).toISOString();
        descriptionText = `Duration extended to ${new Date(newExpiry).toLocaleString()} by ${actor.displayName}.`;
      } else {
        let hours = 3;
        if (inputOrHours.extensionPreset === '12h') hours = 12;
        else if (inputOrHours.extensionPreset === '1d') hours = 24;
        newExpiry = new Date(baseTime + hours * 60 * 60 * 1000).toISOString();
        descriptionText = `Duration extended by ${hours} hours to ${new Date(newExpiry).toLocaleString()} by ${actor.displayName}.`;
      }
    }

    zone.expiresAt = newExpiry;
    zone.updatedAt = new Date().toISOString();
    if (zone.status === 'expired') {
      zone.status = 'active'; // explicit authorized extension reactivates
    }

    this.addZoneAudit(
      zoneId,
      actor.id,
      actor.displayName,
      'extend',
      descriptionText
    );

    this.addNotification(
      zone.ownerId,
      'zone_expiry',
      'Zone Duration Extended',
      `Zone "${zone.name}" duration was extended.`,
      zone.id,
      'zone'
    );

    this.saveAll();
    return { ...zone };
  }

  async deactivateZone(zoneId: string, actor: UserProfile = this.currentUser): Promise<Zone> {
    this.init();
    const zone = this.zones.find((z) => z.id === zoneId);
    if (!zone) throw new Error('Zone not found.');

    const role = this.getUserZoneRole(zoneId, actor);
    if (role !== 'owner' && role !== 'moderator') {
      throw new Error('Unauthorized: Only zone owners or moderators can deactivate a zone.');
    }

    zone.status = 'deactivated';
    zone.updatedAt = new Date().toISOString();

    this.addZoneAudit(
      zoneId,
      actor.id,
      actor.displayName,
      'deactivate',
      `Zone was deactivated by ${actor.displayName}. New posts and claims disabled.`
    );

    this.saveAll();
    return { ...zone };
  }

  async reactivateZone(zoneId: string, actor: UserProfile = this.currentUser): Promise<Zone> {
    this.init();
    const zone = this.zones.find((z) => z.id === zoneId);
    if (!zone) throw new Error('Zone not found.');

    const role = this.getUserZoneRole(zoneId, actor);
    if (role !== 'owner' && role !== 'moderator') {
      throw new Error('Unauthorized: Only zone owners or moderators can reactivate a zone.');
    }

    // Ensure expiration is in the future
    if (new Date(zone.expiresAt).getTime() <= Date.now()) {
      zone.expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    }
    zone.status = 'active';
    zone.updatedAt = new Date().toISOString();

    this.addZoneAudit(
      zoneId,
      actor.id,
      actor.displayName,
      'reactivate',
      `Zone explicitly reactivated by ${actor.displayName} until ${new Date(zone.expiresAt).toLocaleString()}.`
    );

    this.saveAll();
    return { ...zone };
  }

  async getZoneAuditLogs(zoneId: string): Promise<ZoneAuditRecord[]> {
    this.init();
    return this.zoneAuditLogs.filter((l) => l.zoneId === zoneId);
  }

  private addZoneAudit(
    zoneId: string,
    actorId: string,
    actorName: string,
    action: ZoneAuditRecord['action'],
    summary: string
  ) {
    const entry: ZoneAuditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      zoneId,
      actorId,
      actorName,
      action,
      summary,
      timestamp: new Date().toISOString(),
    };
    this.zoneAuditLogs.unshift(entry);
  }

  // ==========================================
  // POSTS & SEARCH/FILTER
  // ==========================================
  async listPosts(
    zoneId: string,
    category?: PostCategory,
    filters?: SearchFilters
  ): Promise<Post[]> {
    this.init();
    const now = Date.now();

    let filtered = this.posts.filter((p) => {
      if (p.zoneId !== zoneId) return false;
      if (p.isRemoved) return false;

      // Filter out posts that are hidden by the 10-report rule or removed by mods
      if (p.moderationStatus === 'removed' || p.moderationStatus === 'pending_moderator_review') {
        return false;
      }

      // Filter out posts whose TTL has expired
      if (new Date(p.expiresAt).getTime() <= now) return false;

      // Category filter
      if (category && (category as string) !== 'all' && p.category !== category) return false;
      if (filters?.category && (filters.category as string) !== 'all' && p.category !== filters.category) return false;

      // Lost & Found status filter
      if (filters?.lostFoundFilter && filters.lostFoundFilter !== 'all') {
        if (p.metadata?.itemType !== filters.lostFoundFilter) return false;
      }
      if (filters?.itemStatusFilter && filters.itemStatusFilter !== 'all') {
        if (p.metadata?.lostFoundStatus !== filters.itemStatusFilter) return false;
      }

      // Keyword query search (title, content, tags)
      if (filters?.query && filters.query.trim().length > 0) {
        const q = filters.query.toLowerCase().trim();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesContent = p.content.toLowerCase().includes(q);
        const matchesTag = p.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesTag) return false;
      }

      return true;
    });

    // Sort newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  }

  async createPost(input: CreatePostInput, author: UserProfile = this.currentUser): Promise<Post> {
    this.init();

    if (author.id === 'usr-guest-visitor') {
      throw new Error('Visitors have read-only access. Please switch identity to an active member or owner to broadcast drops.');
    }

    // Verify zone is active and not expired
    const zone = this.zones.find((z) => z.id === input.zoneId);
    if (!zone) throw new Error('Selected zone does not exist.');
    if (zone.status === 'expired' || new Date(zone.expiresAt).getTime() <= Date.now()) {
      throw new Error('This zone has expired and is locked for new broadcasts.');
    }
    if (zone.status === 'deactivated') {
      throw new Error('This zone is currently deactivated.');
    }

    if (!input.title || input.title.trim().length < 3) {
      throw new Error('Post title must be at least 3 characters.');
    }
    if (!input.content || input.content.trim().length < 5) {
      throw new Error('Post description must be at least 5 characters.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.ttlHours * 60 * 60 * 1000);

    const newPost: Post = {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      zoneId: input.zoneId,
      authorId: author.id,
      authorName: author.displayName,
      authorHandle: author.handle,
      authorAvatar: author.avatarSeed,
      category: input.category,
      title: input.title.trim(),
      content: input.content.trim(),
      ttlHours: input.ttlHours,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isRemoved: false,
      reportCount: 0,
      uniqueReporters: [],
      moderationStatus: 'normal',
      commentCount: 0,
      tags: input.tags || [],
      metadata: {
        ...input.metadata,
        lostFoundStatus:
          input.category === 'lost_found'
            ? input.metadata?.itemType === 'found'
              ? 'found'
              : 'lost'
            : undefined,
      },
    };

    this.posts.unshift(newPost);
    this.saveAll();
    return newPost;
  }

  async editPost(
    postId: string,
    input: EditPostInput,
    actor: UserProfile = this.currentUser
  ): Promise<Post> {
    this.init();
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found.');

    const isAuthor = post.authorId === actor.id;
    const isMod = actor.isModerator;
    if (!isAuthor && !isMod) {
      throw new Error('Unauthorized: Only the original author or a moderator can edit this drop.');
    }

    if (input.title !== undefined) {
      if (input.title.trim().length < 3) {
        throw new Error('Title must be at least 3 characters long.');
      }
      post.title = input.title.trim();
    }

    if (input.content !== undefined) {
      if (input.content.trim().length < 5) {
        throw new Error('Description must be at least 5 characters long.');
      }
      post.content = input.content.trim();
    }

    if (input.tags !== undefined) {
      post.tags = input.tags;
    }

    if (input.metadata !== undefined) {
      post.metadata = {
        ...post.metadata,
        ...input.metadata,
      };
    }

    post.updatedAt = new Date().toISOString();
    this.saveAll();
    return { ...post };
  }

  async deletePost(
    postId: string,
    actor: UserProfile = this.currentUser
  ): Promise<void> {
    this.init();
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found.');

    const isAuthor = post.authorId === actor.id;
    const isMod = actor.isModerator;
    if (!isAuthor && !isMod) {
      throw new Error('Unauthorized: Only the original author or a moderator can delete this drop.');
    }

    post.isRemoved = true;
    post.moderationStatus = 'removed';

    const associatedClaims = this.claims.filter((c) => c.postId === postId);
    for (const claim of associatedClaims) {
      if (claim.status === 'claim_pending' || claim.status === 'pending') {
        claim.status = 'closed';
        this.addNotification(
          claim.claimantId,
          'item_status',
          'Item Broadcast Deleted',
          `The item broadcast for "${post.title}" was deleted by its author.`,
          claim.id,
          'claim'
        );
      }
    }

    this.saveAll();
  }

  // ==========================================
  // PUBLIC COMMENTS & REPLIES
  // ==========================================
  async listComments(postId: string): Promise<Comment[]> {
    this.init();
    return this.comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async addComment(
    postId: string,
    content: string,
    author: UserProfile = this.currentUser
  ): Promise<Comment> {
    this.init();

    if (author.id === 'usr-guest-visitor') {
      throw new Error('Visitors have read-only access. Switch to an active member identity to post comments.');
    }

    const post = this.posts.find((p) => p.id === postId);
    if (!post || post.isRemoved) throw new Error('Post not found or unavailable.');

    const zone = this.zones.find((z) => z.id === post.zoneId);
    if (zone && (zone.status === 'expired' || zone.status === 'deactivated')) {
      throw new Error('Comments are disabled because this zone is expired or deactivated.');
    }

    if (!content || content.trim().length < 2) {
      throw new Error('Comment cannot be empty.');
    }

    const newComment: Comment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      postId,
      zoneId: post.zoneId,
      authorId: author.id,
      authorName: author.displayName,
      authorHandle: author.handle,
      authorAvatar: author.avatarSeed,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    this.comments.push(newComment);
    post.commentCount = (post.commentCount || 0) + 1;

    // Send notification to post author if not commenting on own post
    if (post.authorId !== author.id) {
      this.addNotification(
        post.authorId,
        'comment',
        'New Public Reply',
        `${author.displayName} replied on "${post.title}"`,
        post.id,
        'post'
      );
    }

    this.saveAll();
    return newComment;
  }

  // ==========================================
  // 10 UNIQUE REPORTS AUTO-HIDING RULE
  // ==========================================
  async reportPost(
    postId: string,
    titleOrReason: string | ReportReason,
    reasonOrNotes?: ReportReason | string,
    notesOrReporter?: string | UserProfile,
    reporterArg?: string | UserProfile
  ): Promise<{ report: Report; autoHidden: boolean; totalUniqueReports: number }> {
    this.init();
    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post does not exist.');

    let reason: ReportReason = 'spam';
    let notes: string | undefined = undefined;
    let reporter: UserProfile = this.currentUser;

    if (
      titleOrReason === 'spam' ||
      titleOrReason === 'harassment' ||
      titleOrReason === 'inappropriate' ||
      titleOrReason === 'privacy_violation' ||
      titleOrReason === 'other'
    ) {
      reason = titleOrReason as ReportReason;
      notes = typeof reasonOrNotes === 'string' ? reasonOrNotes : undefined;
      if (typeof notesOrReporter === 'object') reporter = notesOrReporter;
      else if (typeof notesOrReporter === 'string') {
        reporter = SIMULATED_USERS.find((u) => u.id === notesOrReporter) || {
          id: notesOrReporter,
          displayName: notesOrReporter,
          handle: `@${notesOrReporter}`,
          avatarSeed: 'RP',
          isModerator: false,
        };
      }
    } else {
      if (reasonOrNotes) reason = reasonOrNotes as ReportReason;
      if (typeof notesOrReporter === 'string') notes = notesOrReporter;
      if (reporterArg) {
        if (typeof reporterArg === 'object') reporter = reporterArg;
        else {
          reporter = SIMULATED_USERS.find((u) => u.id === reporterArg) || {
            id: reporterArg,
            displayName: reporterArg,
            handle: `@${reporterArg}`,
            avatarSeed: 'RP',
            isModerator: false,
          };
        }
      }
    }

    // Safeguard 1: User cannot report own post
    if (post.authorId === reporter.id) {
      throw new Error('You cannot report your own post.');
    }

    // Safeguard 2: Unique reporter check
    if (!post.uniqueReporters) post.uniqueReporters = [];
    if (post.uniqueReporters.includes(reporter.id)) {
      throw new Error('You have already submitted an active report for this post.');
    }

    // Register reporter atomically
    post.uniqueReporters.push(reporter.id);
    post.reportCount = post.uniqueReporters.length;

    const report: Report = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      postId,
      postTitle: post.title,
      reporterId: reporter.id,
      reason,
      notes,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    this.reports.unshift(report);

    let autoHidden = false;
    // Feature Eight: 10 Unique reports threshold
    if (post.uniqueReporters.length >= 10 && post.moderationStatus === 'normal') {
      post.moderationStatus = 'pending_moderator_review';
      autoHidden = true;

      const modLog: ModerationActionRecord = {
        id: `modlog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        postId: post.id,
        postTitle: post.title,
        action: 'auto_hidden_10_reports',
        reason: `Automatically hidden from public feed upon receiving 10 unique user reports. Sent to moderator review queue.`,
        createdAt: new Date().toISOString(),
      };
      this.moderationActionLogs.unshift(modLog);

      // Notify moderators
      SIMULATED_USERS.filter((u) => u.isModerator).forEach((mod) => {
        this.addNotification(
          mod.id,
          'moderation',
          'Urgent: Drop Auto-Hidden',
          `Drop "${post.title}" reached 10 unique reports and was automatically hidden. Review needed.`,
          post.id,
          'post'
        );
      });
    }

    this.saveAll();
    return {
      report,
      autoHidden,
      totalUniqueReports: post.uniqueReporters.length,
    };
  }

  // ==========================================
  // MODERATION WORKFLOW & AUDIT
  // ==========================================
  listReports(): Report[] {
    this.init();
    return [...this.reports];
  }

  listAllPostsIncludingModerated(): Post[] {
    this.init();
    return [...this.posts];
  }

  listModerationAuditLogs(): ModerationActionRecord[] {
    this.init();
    return [...this.moderationActionLogs];
  }

  async listModerationItems(): Promise<{
    post: Post;
    reports: Report[];
    uniqueCount: number;
    moderationStatus: Post['moderationStatus'];
  }[]> {
    this.init();
    const reportedPostIds = new Set(this.reports.map((r) => r.postId));

    const result = [];
    for (const post of this.posts) {
      if (reportedPostIds.has(post.id) || post.moderationStatus !== 'normal') {
        const postReports = this.reports.filter((r) => r.postId === post.id);
        result.push({
          post,
          reports: postReports,
          uniqueCount: post.uniqueReporters?.length || postReports.length,
          moderationStatus: post.moderationStatus,
        });
      }
    }
    return result;
  }

  async confirmRemovePost(
    postId: string,
    moderatorOrReason?: UserProfile | string,
    reasonText?: string
  ): Promise<void> {
    this.init();
    const moderator = typeof moderatorOrReason === 'object' ? moderatorOrReason : this.currentUser;
    const reason = typeof moderatorOrReason === 'string' ? moderatorOrReason : reasonText || 'Violates community standards';
    if (!moderator.isModerator) throw new Error('Unauthorized: Moderator role required.');

    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found.');

    post.isRemoved = true;
    post.moderationStatus = 'removed';

    // Mark reports as reviewed
    this.reports.filter((r) => r.postId === postId).forEach((r) => (r.status = 'reviewed'));

    this.moderationActionLogs.unshift({
      id: `modlog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      postId,
      postTitle: post.title,
      action: 'confirmed_removed',
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      reason,
      createdAt: new Date().toISOString(),
    });

    this.addNotification(
      post.authorId,
      'moderation',
      'Drop Removed by Moderation',
      `Your drop "${post.title}" was removed by campus moderators. Reason: ${reason}`,
      post.id,
      'post'
    );

    this.saveAll();
  }

  async restorePost(
    postId: string,
    moderatorOrReason?: UserProfile | string,
    reasonText?: string
  ): Promise<void> {
    this.init();
    const moderator = typeof moderatorOrReason === 'object' ? moderatorOrReason : this.currentUser;
    const reason = typeof moderatorOrReason === 'string' ? moderatorOrReason : reasonText || 'Content verified as safe after review';
    if (!moderator.isModerator) throw new Error('Unauthorized: Moderator role required.');

    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found.');

    post.isRemoved = false;
    post.moderationStatus = 'normal'; // Explicitly restore visibility even if reports >= 10!
    this.reports.filter((r) => r.postId === postId).forEach((r) => (r.status = 'reviewed'));

    this.moderationActionLogs.unshift({
      id: `modlog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      postId,
      postTitle: post.title,
      action: 'restored',
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      reason,
      createdAt: new Date().toISOString(),
    });

    this.addNotification(
      post.authorId,
      'moderation',
      'Drop Restored to Feed',
      `Your drop "${post.title}" has been reviewed and restored to the public feed.`,
      post.id,
      'post'
    );

    this.saveAll();
  }

  async dismissReports(
    postId: string,
    moderatorOrReason?: UserProfile | string
  ): Promise<void> {
    this.init();
    const moderator = typeof moderatorOrReason === 'object' ? moderatorOrReason : this.currentUser;
    if (!moderator.isModerator) throw new Error('Unauthorized: Moderator role required.');

    const post = this.posts.find((p) => p.id === postId);
    if (post) {
      if (post.moderationStatus === 'pending_moderator_review') {
        post.moderationStatus = 'normal';
      }
    }
    this.reports.filter((r) => r.postId === postId).forEach((r) => (r.status = 'dismissed'));

    this.moderationActionLogs.unshift({
      id: `modlog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      postId,
      postTitle: post?.title || 'Unknown post',
      action: 'dismissed',
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      reason: 'Reports reviewed and dismissed by moderator.',
      createdAt: new Date().toISOString(),
    });

    this.saveAll();
  }

  async listModerationLogs(): Promise<ModerationActionRecord[]> {
    this.init();
    return [...this.moderationActionLogs];
  }

  // ==========================================
  // PRIVATE LOST & FOUND CLAIMS & MESSAGING
  // ==========================================
  async createClaim(
    inputOrPostId: string | { postId: string; initialClaimantMessage: string },
    claimantArg?: UserProfile,
    claimNotesArg?: string,
    evidenceAttachment?: ClaimEvidenceAttachment
  ): Promise<LostFoundClaim> {
    this.init();
    let postId: string;
    let claimNotes: string;
    let claimant = claimantArg || this.currentUser;

    if (typeof inputOrPostId === 'object') {
      postId = inputOrPostId.postId;
      claimNotes = inputOrPostId.initialClaimantMessage;
    } else {
      postId = inputOrPostId;
      claimNotes = claimNotesArg || '';
    }

    if (claimant.id === 'usr-guest-visitor') {
      throw new Error('Visitors cannot initiate claims. Please select an authenticated student persona.');
    }

    const post = this.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post does not exist.');
    if (post.authorId === claimant.id) {
      throw new Error('You cannot submit a claim on your own item broadcast.');
    }

    const claimId = `claim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const initialMsg: ClaimMessage = {
      id: `cmsg-${Date.now()}-init`,
      claimId,
      senderId: claimant.id,
      senderName: claimant.displayName,
      content: claimNotes.trim(),
      attachment: evidenceAttachment,
      createdAt: now,
    };
    this.claimMessages.push(initialMsg);

    const newClaim: LostFoundClaim = {
      id: claimId,
      postId,
      zoneId: post.zoneId,
      itemTitle: post.title,
      claimantId: claimant.id,
      claimantName: claimant.displayName,
      claimantHandle: claimant.handle,
      finderId: post.authorId,
      finderName: post.authorName,
      status: 'claim_pending',
      claimNotes: claimNotes.trim(),
      evidenceAttachment,
      messages: [initialMsg],
      createdAt: now,
      updatedAt: now,
    };

    this.claims.unshift(newClaim);

    // Update post status to claim_pending
    if (!post.metadata) post.metadata = {};
    post.metadata.lostFoundStatus = 'claim_pending';
    post.metadata.activeClaimId = claimId;

    // Notify Finder privately
    this.addNotification(
      post.authorId,
      'claim_new',
      'New Private Item Claim',
      `${claimant.displayName} submitted a private claim for "${post.title}". Inspect details to approve or request info.`,
      claimId,
      'claim'
    );

    this.saveAll();
    return newClaim;
  }

  async listClaimsForUser(
    user: UserProfile = this.currentUser,
    zoneId?: string
  ): Promise<LostFoundClaim[]> {
    this.init();
    return this.claims.filter((c) => {
      if (zoneId && c.zoneId !== zoneId) return false;
      return c.claimantId === user.id || c.finderId === user.id || user.isModerator;
    });
  }

  async getClaim(
    claimId: string,
    user: UserProfile = this.currentUser
  ): Promise<{ claim: LostFoundClaim; messages: ClaimMessage[]; post?: Post } | null> {
    this.init();
    const claim = this.claims.find((c) => c.id === claimId);
    if (!claim) return null;

    // Access control: only claimant, finder, or moderator can inspect
    const isParticipant =
      claim.claimantId === user.id || claim.finderId === user.id || user.isModerator;
    if (!isParticipant) {
      throw new Error('Access Denied: Private claim conversations are restricted to the item finder and claimant.');
    }

    const messages = this.claimMessages
      .filter((m) => m.claimId === claimId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const post = this.posts.find((p) => p.id === claim.postId);
    return { claim, messages, post };
  }

  async sendClaimMessage(
    claimId: string,
    content: string,
    sender: UserProfile = this.currentUser,
    attachment?: ClaimEvidenceAttachment
  ): Promise<ClaimMessage> {
    this.init();
    const claim = this.claims.find((c) => c.id === claimId);
    if (!claim) throw new Error('Claim not found.');

    const isParticipant =
      claim.claimantId === sender.id || claim.finderId === sender.id || sender.isModerator;
    if (!isParticipant) throw new Error('Unauthorized to post in this private claim.');

    if (!content.trim() && !attachment) {
      throw new Error('Message cannot be empty.');
    }

    const newMsg: ClaimMessage = {
      id: `cmsg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      claimId,
      senderId: sender.id,
      senderName: sender.displayName,
      content: content.trim(),
      attachment,
      createdAt: new Date().toISOString(),
    };

    this.claimMessages.push(newMsg);
    claim.updatedAt = new Date().toISOString();

    // Notify other participant
    const recipientId = sender.id === claim.claimantId ? claim.finderId : claim.claimantId;
    this.addNotification(
      recipientId,
      'claim_message',
      'New Private Claim Message',
      `${sender.displayName} sent a message regarding "${claim.itemTitle}".`,
      claimId,
      'claim'
    );

    this.saveAll();
    return newMsg;
  }

  async updateClaimStatus(
    claimId: string,
    newStatus: ClaimStatus,
    actor: UserProfile = this.currentUser
  ): Promise<LostFoundClaim> {
    this.init();
    const claim = this.claims.find((c) => c.id === claimId);
    if (!claim) throw new Error('Claim not found.');

    const isFinder = claim.finderId === actor.id;
    const isClaimant = claim.claimantId === actor.id;
    const isMod = actor.isModerator;

    if (!isFinder && !isClaimant && !isMod) {
      throw new Error('Unauthorized to update claim status.');
    }

    claim.status = newStatus;
    claim.updatedAt = new Date().toISOString();

    const post = this.posts.find((p) => p.id === claim.postId);

    if (newStatus === 'approved') {
      claim.decisionTimestamp = new Date().toISOString();
      if (post && post.metadata) {
        post.metadata.lostFoundStatus = 'claim_pending';
      }
      this.addNotification(
        claim.claimantId,
        'claim_decision',
        'Item Claim Approved!',
        `Your claim for "${claim.itemTitle}" was approved by ${actor.displayName}. Coordinate handover via private message.`,
        claimId,
        'claim'
      );
    } else if (newStatus === 'rejected') {
      claim.decisionTimestamp = new Date().toISOString();
      if (post && post.metadata) {
        post.metadata.lostFoundStatus = 'found'; // revert post to found so other claimants can apply
      }
      this.addNotification(
        claim.claimantId,
        'claim_decision',
        'Claim Not Approved',
        `Your claim for "${claim.itemTitle}" was reviewed and declined by the finder.`,
        claimId,
        'claim'
      );
    } else if (newStatus === 'returned') {
      claim.returnTimestamp = new Date().toISOString();
      if (post && post.metadata) {
        post.metadata.lostFoundStatus = 'returned';
      }
      this.addNotification(
        claim.claimantId === actor.id ? claim.finderId : claim.claimantId,
        'item_status',
        'Item Returned & Closed',
        `Item "${claim.itemTitle}" was confirmed returned. Handover complete!`,
        claimId,
        'claim'
      );
    } else if (newStatus === 'closed') {
      if (post && post.metadata) {
        post.metadata.lostFoundStatus = 'closed';
      }
    }

    this.saveAll();
    return { ...claim };
  }

  // ==========================================
  // IN-APP NOTIFICATIONS
  // ==========================================
  async listNotifications(userId: string = this.currentUser.id): Promise<InAppNotification[]> {
    this.init();
    return this.notifications
      .filter((n) => n.recipientId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    this.init();
    const notif = this.notifications.find((n) => n.id === notificationId);
    if (notif) {
      notif.readAt = new Date().toISOString();
      this.saveAll();
    }
  }

  async markAllNotificationsRead(userId: string = this.currentUser.id): Promise<void> {
    this.init();
    const now = new Date().toISOString();
    this.notifications.filter((n) => n.recipientId === userId).forEach((n) => (n.readAt = now));
    this.saveAll();
  }

  private addNotification(
    recipientId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityId?: string,
    entityType?: 'post' | 'claim' | 'zone'
  ) {
    const notif: InAppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientId,
      type,
      title,
      message,
      entityId,
      entityType,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(notif);
  }

  // ==========================================
  // RESET DEMO DATA
  // ==========================================
  async resetDemoData(): Promise<void> {
    this.zones = [...MOCK_ZONES];
    this.zoneAuditLogs = [];
    this.posts = [...INITIAL_MOCK_POSTS];
    this.comments = [...INITIAL_MOCK_COMMENTS];
    this.reports = [];
    this.moderationActionLogs = [];
    this.claims = [];
    this.claimMessages = [];
    this.notifications = [...INITIAL_MOCK_NOTIFICATIONS];
    this.currentUser = CURRENT_USER;
    this.saveAll();
  }
}

export const postService = new DropZoneService();
export const dropZoneService = postService;

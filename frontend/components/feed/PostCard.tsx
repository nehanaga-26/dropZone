'use client';

import React, { useState, useEffect } from 'react';
import { Post, LostFoundClaim } from '../../lib/types';
import {
  ClockIcon,
  FlagIcon,
  MessageSquareIcon,
  ShieldIcon,
  SparklesIcon,
  CheckCircleIcon,
  EditIcon,
  TrashIcon,
} from '../ui/icons';
import { Badge } from '../ui/Badge';
import { CommentsSection } from './CommentsSection';
import { dropZoneService } from '../../lib/services/postService';

interface PostCardProps {
  post: Post;
  zoneName: string;
  isZoneActive?: boolean;
  onReport: (post: Post) => void;
  onInitiateClaim?: (post: Post) => void;
  onOpenClaim?: (claimId: string) => void;
  onEditPost?: (post: Post) => void;
  onDeletePost?: (post: Post) => void;
  onBlockUser?: (post: Post) => void;
}

export function PostCard({
  post,
  zoneName,
  isZoneActive = true,
  onReport,
  onInitiateClaim,
  onOpenClaim,
  onEditPost,
  onDeletePost,
  onBlockUser,
}: PostCardProps) {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(0);
  const [existingClaim, setExistingClaim] = useState<LostFoundClaim | null>(null);

  const currentUser = dropZoneService.getCurrentUser();

  // Load comment count and user's claim on this post
  useEffect(() => {
    let isMounted = true;
    // Private thread: don't even fetch comments unless allowed to see them.
    if (!canViewComments) {
      return () => {
        isMounted = false;
      };
    }
    dropZoneService.listComments(post.id).then((comments) => {
      if (isMounted) setCommentCount(comments.length);
    }).catch(() => {});

    if (post.category === 'lost_found') {
      dropZoneService.listClaimsForUser(currentUser).then((claims) => {
        if (isMounted) {
          const myClaim = claims.find((c: LostFoundClaim) => c.postId === post.id);
          setExistingClaim(myClaim || null);
        }
      }).catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [post.id, post.category, currentUser.id]);

  // Dynamically compute remaining TTL
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = Date.now();
      const expires = new Date(post.expiresAt).getTime();
      const diffMs = expires - now;

      if (diffMs <= 0) {
        setTimeLeftStr('Expired');
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeftStr(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeftStr(`${hours}h ${minutes}m`);
      } else {
        setTimeLeftStr(`${minutes}m`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [post.expiresAt]);

  const categoryBadge = {
    feed: <Badge variant="blue" size="sm">ZONE FEED</Badge>,
    lost_found: <Badge variant="amber" size="sm">LOST & FOUND</Badge>,
    team_match: <Badge variant="lavender" size="sm">TEAM MATCH</Badge>,
  }[post.category];

  const createdDate = new Date(post.createdAt);
  const formattedTime = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const borderHighlight = {
    feed: 'hover:border-[#248BFF]/50',
    lost_found: 'hover:border-[#F4A340]/50',
    team_match: 'hover:border-[#8B78F6]/50',
  }[post.category];

  const isAuthor = post.authorId === currentUser.id;

  // Privacy: on FOUND-item posts, only the finder (author) + moderators
  // can see comments — identifiers stay between finder and claimant.
  const isFoundPost = post.category === 'lost_found' && post.metadata?.itemType === 'found';
  const canViewComments = !isFoundPost || isAuthor || currentUser.isModerator;

  return (
    <article
      className={`rounded-3xl bg-white border border-[#809DC4]/22 ${borderHighlight} p-6 shadow-[0_6px_24px_rgba(36,139,255,0.05)] hover:shadow-[0_12px_32px_rgba(36,139,255,0.1)] transition-all duration-200 flex flex-col gap-3.5 group`}
    >
      {/* Header: Author Info, Category Badge, and Amber TTL Countdown */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Pseudonymous Avatar Badge */}
          <div className="w-10 h-10 rounded-2xl bg-[#E8F4FF] border border-[#248BFF]/25 flex items-center justify-center text-xs font-mono font-bold text-[#248BFF] shadow-sm">
            {post.authorAvatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#172B4D]">{post.authorName}</span>
              <span className="text-xs text-[#71819A] font-mono">{post.authorHandle}</span>
              {isAuthor && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                  YOU
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#71819A]">
              <span className="text-[#248BFF] font-semibold">{zoneName}</span>
              <span>•</span>
              <span>{formattedTime}</span>
              {post.updatedAt && (
                <span className="text-[10px] text-[#248BFF] font-sans font-medium">(edited)</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {categoryBadge}

          {/* Time to Live (TTL) Amber Indicator */}
          <div
            className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#FEF5E9] border border-[#F4A340]/40 text-[#D48220] font-bold shadow-sm"
            title={`Configured TTL: ${post.ttlHours}h total duration`}
          >
            <ClockIcon size={12} className="text-[#F4A340] shrink-0" />
            <span>{timeLeftStr}</span>
          </div>
          {typeof post.metadata?.radiusM === 'number' && (
            <div
              className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#E8F4FF] border border-[#248BFF]/40 text-[#248BFF] font-bold shadow-sm"
              title="Visible only within this radius of the zone centre"
            >
              <span>📍 {post.metadata.radiusM}m</span>
            </div>
          )}
        </div>
      </div>

      {/* Post Title & Description */}
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-[#172B4D] group-hover:text-[#248BFF] transition-colors leading-snug">
          {post.title}
        </h3>
        <p className="text-xs sm:text-sm text-[#71819A] leading-relaxed whitespace-pre-line">
          {post.content}
        </p>
      </div>

      {/* Differentiated Category Details */}

      {/* 1. Lost & Found Details & Private Claim Action */}
      {post.category === 'lost_found' && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F5F9FF] border border-[#809DC4]/20 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge
                variant={post.metadata?.itemType === 'lost' ? 'rose' : 'mint'}
                size="sm"
              >
                {post.metadata?.itemType === 'lost' ? 'LOST ITEM' : 'FOUND ITEM'}
              </Badge>

              {/* Lifecycle status indicator */}
              {(post.metadata?.lostFoundStatus || post.metadata?.itemStatus) && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                  (post.metadata?.lostFoundStatus || post.metadata?.itemStatus) === 'returned'
                    ? 'bg-emerald-100 text-emerald-800'
                    : (post.metadata?.lostFoundStatus || post.metadata?.itemStatus) === 'claim_pending'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {(post.metadata?.lostFoundStatus || post.metadata?.itemStatus)?.replace('_', ' ')}
                </span>
              )}

              {post.metadata?.contactHint && (
                <span className="text-xs text-[#71819A]">
                  <strong className="text-[#172B4D]">Hint:</strong> {post.metadata.contactHint}
                </span>
              )}
            </div>

            {/* Claim button */}
            <div className="flex items-center gap-2">
              {existingClaim ? (
                <button
                  type="button"
                  onClick={() => onOpenClaim && onOpenClaim(existingClaim.id)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1 shadow-sm"
                >
                  <ShieldIcon size={12} />
                  <span>View Private Claim ({existingClaim.status})</span>
                </button>
              ) : !isAuthor && (post.metadata?.lostFoundStatus || post.metadata?.itemStatus) !== 'returned' ? (
                <button
                  type="button"
                  onClick={() => onInitiateClaim && onInitiateClaim(post)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white text-xs font-bold hover:opacity-90 transition flex items-center gap-1 shadow-sm"
                >
                  <ShieldIcon size={12} />
                  <span>{post.metadata?.itemType === 'found' ? 'Claim This Item' : 'I Found This Item'}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 2. Team Match Details */}
      {post.category === 'team_match' && post.metadata && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F8F6FF] border border-[#8B78F6]/20 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-mono text-[#8B78F6] font-bold">SKILLS:</span>
            {post.metadata.skillsNeeded?.map((skill) => (
              <span
                key={skill}
                className="px-2.5 py-0.5 rounded-lg bg-white text-[#7A63F4] font-mono text-[11px] border border-[#8B78F6]/25 shadow-2xs font-semibold"
              >
                {skill}
              </span>
            ))}
          </div>
          {post.metadata.teamSize && (
            <span className="text-[11px] font-mono text-[#139B79] bg-[#E8FAF4] px-2.5 py-0.5 rounded-full border border-[#17B890]/25 font-bold">
              TEAM: {post.metadata.teamSize}
            </span>
          )}
        </div>
      )}

      {/* Tags and Action Bar */}
      <div className="pt-2.5 border-t border-[#809DC4]/18 flex items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {post.tags?.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono text-[#248BFF] bg-[#E8F4FF] px-2.5 py-0.5 rounded-lg border border-[#248BFF]/20 font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Action Buttons: Comments, Edit, Delete, Report */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {canViewComments ? (
            <button
              type="button"
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 py-1 px-2.5 rounded-xl transition text-xs font-semibold ${
                showComments
                  ? 'bg-[#E8F4FF] text-[#248BFF]'
                  : 'text-[#71819A] hover:bg-[#F0F4FA] hover:text-[#172B4D]'
              }`}
              title="View public discussion and replies"
            >
              <MessageSquareIcon size={14} />
              <span>Comments ({commentCount})</span>
            </button>
          ) : (
            <span
              title="Only the finder sees comments on found items"
              className="flex items-center gap-1 py-1 px-2.5 rounded-xl text-[11px] font-mono text-[#71819A] bg-[#F5F9FF] border border-[#809DC4]/20"
            >
              🔒 Finder-only thread
            </span>
          )}

          {/* Author Controls: Edit & Delete */}
          {isAuthor ? (
            <>
              <button
                type="button"
                onClick={() => onEditPost && onEditPost(post)}
                className="flex items-center gap-1 py-1 px-2.5 rounded-xl text-xs font-semibold text-[#248BFF] hover:bg-[#E8F4FF] transition"
                title="Edit this drop"
              >
                <EditIcon size={13} />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => onDeletePost && onDeletePost(post)}
                className="flex items-center gap-1 py-1 px-2.5 rounded-xl text-xs font-semibold text-[#EF5B72] hover:bg-[#FEEFF1] transition"
                title="Delete this drop"
              >
                <TrashIcon size={13} />
                <span>Delete</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onReport(post)}
                className="flex items-center gap-1 py-1 px-2.5 rounded-xl transition font-medium text-[#71819A] hover:text-[#EF5B72] hover:bg-[#FEEFF1]"
                title="Flag inappropriate or unsafe content"
              >
                <FlagIcon size={12} />
                <span className="text-[11px] font-mono uppercase tracking-wider">Report</span>
              </button>
              {onBlockUser && (
                <button
                  type="button"
                  onClick={() => onBlockUser(post)}
                  className="flex items-center gap-1 py-1 px-2.5 rounded-xl transition font-medium text-[#71819A] hover:text-[#172B4D] hover:bg-[#F0F4FA]"
                  title="Hide all posts from this user"
                >
                  <span className="text-[11px] font-mono uppercase tracking-wider">Block</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Expandable Comments Section */}
      {showComments && canViewComments && (
        <CommentsSection
          postId={post.id}
          zoneId={post.zoneId}
          isZoneActive={isZoneActive}
          onCommentCountChange={(c) => setCommentCount(c)}
        />
      )}
    </article>
  );
}

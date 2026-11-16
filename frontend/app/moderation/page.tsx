'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldIcon,
  AlertTriangleIcon,
  CheckIcon,
  TrashIcon,
  ArrowLeftIcon,
  RefreshCwIcon,
  HistoryIcon,
  CheckCircleIcon,
  EyeIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/Badge';
import { BackendQueuePanel } from '@/components/moderation/BackendQueuePanel';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { dropZoneService } from '@/lib/services/postService';
import { Report, Post, ModerationActionRecord } from '@/lib/types';

function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [moderationPosts, setModerationPosts] = useState<Post[]>([]);
  const [auditLogs, setAuditLogs] = useState<ModerationActionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentUser = dropZoneService.getCurrentUser();
  const isModerator = currentUser.isModerator;

  const fetchModerationData = () => {
    setIsLoading(true);
    try {
      const allReports = dropZoneService.listReports();
      setReports(allReports);

      // Find posts that have reports or are in pending_moderator_review or removed
      const allPosts = dropZoneService.listAllPostsIncludingModerated();
      const flagged = allPosts.filter(
        (p) => (p.reportCount && p.reportCount > 0) || p.moderationStatus === 'pending_moderator_review' || p.moderationStatus === 'removed'
      );
      setModerationPosts(flagged);

      setAuditLogs(dropZoneService.listModerationAuditLogs());
    } catch (e) {
      console.error('Failed to load moderation queue', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationData();
  }, []);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleConfirmRemoval = async (postId: string) => {
    if (!isModerator) {
      showStatus('Unauthorized: Active persona is not a moderator.', 'error');
      return;
    }
    try {
      await dropZoneService.confirmRemovePost(postId, 'Violated community safety and anti-harassment policy.');
      showStatus('Post permanently removed from public spatial feeds.');
      fetchModerationData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to remove post.', 'error');
    }
  };

  const handleRestorePost = async (postId: string) => {
    if (!isModerator) {
      showStatus('Unauthorized: Active persona is not a moderator.', 'error');
      return;
    }
    try {
      await dropZoneService.restorePost(postId, 'Reviewed and verified as compliant by moderator.');
      showStatus('Post successfully restored to public spatial feed!');
      fetchModerationData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to restore post.', 'error');
    }
  };

  const handleDismissReports = async (postId: string) => {
    if (!isModerator) {
      showStatus('Unauthorized: Active persona is not a moderator.', 'error');
      return;
    }
    try {
      await dropZoneService.dismissReports(postId, 'Reports reviewed and dismissed as false positives.');
      showStatus('Reports dismissed.');
      fetchModerationData();
    } catch (err: any) {
      showStatus(err.message || 'Failed to dismiss reports.', 'error');
    }
  };

  // Simulate 10 unique reports for testing threshold
  const handleSimulate10Reports = async (targetPostId: string) => {
    try {
      const mockReporters = [
        'usr-test-1', 'usr-test-2', 'usr-test-3', 'usr-test-4', 'usr-test-5',
        'usr-test-6', 'usr-test-7', 'usr-test-8', 'usr-test-9', 'usr-test-10'
      ];
      for (const repId of mockReporters) {
        await dropZoneService.reportPost(
          targetPostId,
          'Test Target',
          'spam',
          'Automated demonstration test report',
          repId
        );
      }
      showStatus('Simulated 10 unique reports! Post automatically hidden from public feed.');
      fetchModerationData();
    } catch (err: any) {
      showStatus(err.message || 'Simulation error', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF4FF] text-[#172B4D] flex flex-col selection:bg-[#248BFF]/20 selection:text-[#248BFF]">
      {/* Header */}
      <header className="sticky top-3 z-30 w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 mb-4">
        <div className="h-16 rounded-2xl bg-white/80 backdrop-blur-xl border border-[#809DC4]/25 shadow-[0_8px_30px_rgba(36,139,255,0.06)] px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-mono text-[#71819A] hover:text-[#172B4D] px-3.5 py-2 rounded-xl bg-[#F5F9FF] border border-[#809DC4]/25 hover:border-[#248BFF]/35 transition flex items-center gap-1.5 shadow-2xs"
            >
              <ArrowLeftIcon size={14} />
              <span>Back to Zone Feed</span>
            </Link>
            <div className="h-4 w-[1px] bg-[#809DC4]/30" />
            <div className="flex items-center gap-2">
              <ShieldIcon size={18} className="text-[#8B78F6]" />
              <h1 className="text-sm sm:text-base font-bold text-[#172B4D]">
                Moderation Review & Safety Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#71819A] hidden sm:inline">
              Active: <strong className="text-[#172B4D]">{currentUser.displayName}</strong>
            </span>
            <Badge variant={isModerator ? 'lavender' : 'amber'} size="sm">
              {isModerator ? 'MODERATOR ACCESS' : 'MEMBER (READ-ONLY)'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 flex-1 flex flex-col gap-6">
        {/* Banner with 10-Report Rule Explanation */}
        <div className="p-5 rounded-3xl bg-white/85 backdrop-blur-xl border border-[#248BFF]/30 text-xs text-[#172B4D] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_6px_24px_rgba(36,139,255,0.08)]">
          <div className="flex items-start gap-3">
            <ShieldIcon size={22} className="text-[#248BFF] shrink-0 mt-0.5" />
            <div className="leading-relaxed space-y-1">
              <strong className="text-sm font-bold text-[#172B4D]">
                Automated 10-Unique-Report Community Protection:
              </strong>
              <p className="text-xs text-[#71819A]">
                When any post receives 10 distinct reports from 10 unique campus users, DropZone immediately hides it from the public spatial feed to prevent harm. Content remains in this review queue until an authorized moderator confirms removal or restores it.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSimulate10Reports('post-arena-1')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white text-xs font-mono font-bold whitespace-nowrap transition shadow-sm hover:opacity-90 shrink-0"
          >
            + Test 10-Report Auto-Hide Trigger
          </button>
        </div>

        {/* Live backend queue (server-enforced) — mock queue below stays for preview */}
        <BackendQueuePanel />

        {statusMessage && (
          <div className={`p-3.5 rounded-2xl text-xs font-mono font-bold flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-[#E8FAF4] border border-[#17B890]/35 text-[#139B79]'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* SECTION 1: Flagged Posts & Review Queue */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-mono tracking-widest font-bold text-[#71819A]">
              Flagged Content & Auto-Hidden Queue ({moderationPosts.length})
            </h2>
            <button
              onClick={fetchModerationData}
              className="text-xs font-mono text-[#248BFF] hover:underline font-semibold flex items-center gap-1"
            >
              <RefreshCwIcon size={12} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs font-mono text-[#71819A]">
              Loading safety queue...
            </div>
          ) : moderationPosts.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white/80 backdrop-blur-xl border border-[#809DC4]/25 text-center flex flex-col items-center justify-center gap-3 shadow-[0_8px_30px_rgba(36,139,255,0.04)]">
              <div className="w-12 h-12 rounded-2xl bg-[#E8FAF4] text-[#17B890] flex items-center justify-center border border-[#17B890]/25 shadow-inner">
                <CheckIcon size={22} />
              </div>
              <h3 className="text-base font-bold text-[#172B4D]">Review Queue is Completely Clean</h3>
              <p className="text-xs text-[#71819A] max-w-sm leading-relaxed">
                No active posts currently exceed the report threshold. Click the button above to simulate 10 reports and observe the automatic hiding workflow.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {moderationPosts.map((post) => {
                const uniqueCount = post.uniqueReporters?.length || post.reportCount || 0;
                const isAutoHidden = post.moderationStatus === 'pending_moderator_review';
                const isRemoved = post.moderationStatus === 'removed';

                return (
                  <div
                    key={post.id}
                    className="rounded-3xl bg-white/90 backdrop-blur-xl border border-[#809DC4]/25 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_6px_24px_rgba(36,139,255,0.05)] hover:border-[#248BFF]/40 transition"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isAutoHidden && (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-mono font-bold uppercase animate-pulse">
                            🚨 AUTO-HIDDEN (10+ REPORTS)
                          </span>
                        )}
                        {isRemoved && (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-mono font-bold uppercase">
                            REMOVED BY MODERATOR
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-mono font-bold">
                          {uniqueCount} Unique Reports
                        </span>
                        <span className="text-[11px] font-mono text-[#71819A]">
                          Author: {post.authorName} ({post.authorHandle})
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-[#172B4D]">
                        &ldquo;{post.title}&rdquo;
                      </h4>

                      <p className="text-xs text-[#71819A] line-clamp-2">
                        {post.content}
                      </p>

                      <div className="text-[10px] font-mono text-[#9AA8BC]">
                        Post ID: {post.id} • Zone ID: {post.zoneId} • TTL: {post.ttlHours}h
                      </div>
                    </div>

                    {/* Moderator Decision Controls */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                      {isAutoHidden || isRemoved ? (
                        <button
                          onClick={() => handleRestorePost(post.id)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold transition flex items-center gap-1 shadow-2xs"
                        >
                          <EyeIcon size={14} />
                          <span>Restore to Feed</span>
                        </button>
                      ) : null}

                      {!isRemoved && (
                        <button
                          onClick={() => handleConfirmRemoval(post.id)}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold transition flex items-center gap-1 shadow-2xs"
                        >
                          <TrashIcon size={14} />
                          <span>Confirm Removal</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDismissReports(post.id)}
                        className="px-3 py-2 rounded-xl bg-[#F5F9FF] border border-[#809DC4]/25 hover:bg-white text-[#71819A] hover:text-[#172B4D] text-xs font-mono font-semibold transition"
                      >
                        Dismiss Reports
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: Moderation Decision Audit History */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-mono tracking-widest font-bold text-[#71819A] flex items-center gap-1.5">
              <HistoryIcon size={14} />
              <span>Moderation Action Audit Log ({auditLogs.length})</span>
            </h2>
          </div>

          <div className="rounded-3xl bg-white/80 border border-[#809DC4]/25 p-4 max-h-60 overflow-y-auto space-y-2">
            {auditLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#71819A] font-mono">
                No moderation actions taken yet.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-[#F8FAFD] border border-[#809DC4]/20 text-xs flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#172B4D] font-mono uppercase text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        {log.action.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] font-semibold text-[#172B4D]">
                        Post ID: {log.postId}
                      </span>
                    </div>
                    <p className="text-xs text-[#71819A]">{log.reason}</p>
                  </div>
                  <div className="text-right text-[10px] font-mono text-[#71819A] shrink-0">
                    <div>Mod: {log.moderatorId}</div>
                    <div>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function ModerationRoute() {
  return (
    <RequireAuth>
      <ModerationPage />
    </RequireAuth>
  );
}

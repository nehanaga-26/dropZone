'use client';

import React, { useState, useEffect } from 'react';
import { Comment } from '../../lib/types';
import { dropZoneService } from '../../lib/services/postService';
import { SparklesIcon, AlertTriangleIcon } from '../ui/icons';

interface CommentsSectionProps {
  postId: string;
  zoneId: string;
  isZoneActive: boolean;
  onCommentCountChange?: (newCount: number) => void;
}

export function CommentsSection({
  postId,
  zoneId,
  isZoneActive,
  onCommentCountChange,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentUser = dropZoneService.getCurrentUser();

  const loadComments = async () => {
    try {
      const list = await dropZoneService.listComments(postId);
      setComments(list);
      if (onCommentCountChange) onCommentCountChange(list.length);
    } catch (e) {
      console.warn('Failed to load comments', e);
    }
  };

  useEffect(() => {
    loadComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isZoneActive) {
      setErrorMsg('Cannot comment: This spatial zone is expired or deactivated.');
      return;
    }

    if (!content.trim()) {
      setErrorMsg('Comment text cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dropZoneService.addComment(postId, content.trim(), currentUser);
      setContent('');
      await loadComments();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#809DC4]/20 space-y-3">
      <div className="flex items-center justify-between text-xs text-[#71819A]">
        <span className="font-semibold uppercase tracking-wider text-[10px]">
          Public Comments ({comments.length})
        </span>
        <span className="text-[10px] font-mono">Posting as {currentUser.displayName}</span>
      </div>

      {errorMsg && (
        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
          <AlertTriangleIcon size={14} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Comment Input */}
      {isZoneActive ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a public reply or comment..."
            maxLength={300}
            className="flex-1 px-3 py-1.5 rounded-xl bg-[#F0F4FA] border border-[#809DC4]/30 text-xs text-[#172B4D] placeholder:text-[#809DC4] outline-none focus:border-[#248BFF] focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white text-xs font-bold hover:opacity-90 disabled:opacity-40 transition flex items-center gap-1 shrink-0"
          >
            <SparklesIcon size={12} />
            <span>Reply</span>
          </button>
        </form>
      ) : (
        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] text-center">
          Zone is inactive. Public comments are closed.
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-[11px] text-[#71819A] italic py-1">No comments yet. Be the first to reply!</p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="p-2.5 rounded-xl bg-[#F8FAFD] border border-[#809DC4]/20 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-[#E8F4FF] text-[#248BFF] text-[9px] font-bold flex items-center justify-center font-mono">
                    {c.authorAvatar || c.authorName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-bold text-[#172B4D] text-[11px]">{c.authorName}</span>
                  <span className="text-[10px] text-[#71819A] font-mono">{c.authorHandle}</span>
                </div>
                <span className="text-[9px] text-[#71819A] font-mono">
                  {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-[#172B4D] pl-6">{c.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

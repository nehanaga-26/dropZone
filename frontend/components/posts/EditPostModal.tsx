'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Post, EditPostInput } from '../../lib/types';
import { dropZoneService } from '../../lib/services/postService';
import { EditIcon, SparklesIcon, AlertTriangleIcon, CheckIcon } from '../ui/icons';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onPostUpdated: (updatedPost: Post) => void;
}

export function EditPostModal({ isOpen, onClose, post, onPostUpdated }: EditPostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [contactHint, setContactHint] = useState('');
  const [skillsNeeded, setSkillsNeeded] = useState('');
  const [teamSize, setTeamSize] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (post && isOpen) {
      setTitle(post.title);
      setContent(post.content);
      setTagInput((post.tags || []).join(', '));
      setContactHint(post.metadata?.contactHint || '');
      setSkillsNeeded((post.metadata?.skillsNeeded || []).join(', '));
      setTeamSize(post.metadata?.teamSize || '');
      setErrorMsg(null);
      setSuccessMsg(false);
    }
  }, [post, isOpen]);

  if (!post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (title.trim().length < 3) {
      setErrorMsg('Title must be at least 3 characters long.');
      return;
    }

    if (content.trim().length < 5) {
      setErrorMsg('Description must be at least 5 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter((t) => t.length > 0);

      const parsedSkills = skillsNeeded
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const input: EditPostInput = {
        title: title.trim(),
        content: content.trim(),
        tags: parsedTags,
        metadata: {
          ...post.metadata,
          contactHint: contactHint.trim() || undefined,
          skillsNeeded: parsedSkills.length > 0 ? parsedSkills : post.metadata?.skillsNeeded,
          teamSize: teamSize.trim() || post.metadata?.teamSize,
        },
      };

      const updated = await dropZoneService.editPost(post.id, input);
      setSuccessMsg(true);
      setTimeout(() => {
        onPostUpdated(updated);
        onClose();
        setSuccessMsg(false);
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Your Drop"
      subtitle={`MODIFY BROADCAST CONTENT // ID: ${post.id}`}
      maxWidth="md"
    >
      {successMsg ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
            <CheckIcon size={24} />
          </div>
          <h4 className="text-base font-bold text-[#172B4D]">Drop Updated Successfully!</h4>
          <p className="text-xs text-[#71819A]">Your changes have been saved to the spatial zone feed.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangleIcon size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#71819A] mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              maxLength={100}
              required
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#809DC4]/30 text-xs font-semibold text-[#172B4D] outline-none focus:border-[#248BFF] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#71819A] mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What are you sharing?"
              maxLength={500}
              required
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#809DC4]/30 text-xs text-[#172B4D] outline-none focus:border-[#248BFF] transition resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#71819A] mb-1">
              Tags <span className="text-[10px] lowercase font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. hackathon, hardware, snacks"
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#809DC4]/30 text-xs text-[#172B4D] outline-none focus:border-[#248BFF] transition"
            />
          </div>

          {post.category === 'lost_found' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#71819A] mb-1">
                Contact Hint / Claim Verification
              </label>
              <input
                type="text"
                value={contactHint}
                onChange={(e) => setContactHint(e.target.value)}
                placeholder="e.g. Describe sticker on bottom, room 402"
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#809DC4]/30 text-xs text-[#172B4D] outline-none focus:border-[#248BFF] transition"
              />
            </div>
          )}

          {post.category === 'team_match' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#71819A] mb-1">
                  Skills Needed
                </label>
                <input
                  type="text"
                  value={skillsNeeded}
                  onChange={(e) => setSkillsNeeded(e.target.value)}
                  placeholder="e.g. React, Python"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#809DC4]/30 text-xs text-[#172B4D] outline-none focus:border-[#248BFF] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#71819A] mb-1">
                  Team Size
                </label>
                <input
                  type="text"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  placeholder="e.g. 2 / 4 members"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#809DC4]/30 text-xs text-[#172B4D] outline-none focus:border-[#248BFF] transition"
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2 border-t border-[#809DC4]/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#71819A] hover:bg-[#F0F4FA] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white text-xs font-bold hover:opacity-95 transition flex items-center gap-1.5 shadow-sm"
            >
              <SparklesIcon size={14} />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

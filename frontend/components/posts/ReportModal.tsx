'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Post, ReportReason } from '../../lib/types';
import { FlagIcon, CheckIcon, ShieldIcon } from '../ui/icons';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onReportSubmitted: (postId: string, title: string, reason: ReportReason, notes?: string) => Promise<any>;
}

export function ReportModal({ isOpen, onClose, post, onReportSubmitted }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setReason('spam');
      setNotes('');
      setSubmitted(false);
    }
  }, [isOpen]);

  if (!post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onReportSubmitted(post.id, post.title, reason, notes);
      setSubmitted(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmitted(false);
        onClose();
      }, 1000);
    } catch (e) {
      setIsSubmitting(false);
    }
  };

  const reasonOptions: { id: ReportReason; label: string; desc: string }[] = [
    { id: 'spam', label: 'Spam or Promotional', desc: 'Commercial advertisements, repetitive text, or link dumping.' },
    { id: 'harassment', label: 'Harassment / Abusive', desc: 'Bullying, offensive language, or targeted attacks.' },
    { id: 'inappropriate', label: 'Inappropriate Content', desc: 'Violates campus event or community guidelines.' },
    { id: 'privacy_violation', label: 'Privacy / Doxxing', desc: 'Exposes private student data, phone numbers, or coordinates.' },
    { id: 'other', label: 'Other Concern', desc: 'Any other safety or community standard violation.' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Content to Moderation Queue"
      subtitle={`Flagging drop: "${post.title}"`}
      maxWidth="sm"
    >
      {submitted ? (
        <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E8FAF4] text-[#17B890] border border-[#17B890]/40 flex items-center justify-center shadow-sm">
            <CheckIcon size={24} />
          </div>
          <h3 className="text-base font-bold text-[#172B4D]">Report Registered</h3>
          <p className="text-xs text-[#71819A] font-mono max-w-xs">
            Thank you for protecting our zone. The post has been queued for moderator review.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-[#71819A] mb-2">
              Select Violation Reason *
            </label>
            <div className="space-y-2">
              {reasonOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                    reason === opt.id
                      ? 'bg-[#FEEFF1] border-[#EF5B72]/60 text-[#172B4D] shadow-xs'
                      : 'bg-white border-[#809DC4]/25 text-[#71819A] hover:bg-[#F5F9FF]'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reason === opt.id}
                    onChange={() => setReason(opt.id)}
                    className="mt-0.5 text-[#EF5B72] focus:ring-[#EF5B72]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#172B4D]">{opt.label}</div>
                    <div className="text-[11px] text-[#71819A] mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="report-notes" className="block text-xs font-mono uppercase tracking-wider font-semibold text-[#71819A] mb-1">
              Additional Context (Optional)
            </label>
            <textarea
              id="report-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide context for campus moderators..."
              className="w-full text-xs bg-white text-[#172B4D] border border-[#809DC4]/30 rounded-xl px-3 py-2 focus:outline-none focus:border-[#EF5B72] placeholder-[#9AA8BC] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#809DC4]/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-mono text-[#71819A] hover:text-[#172B4D]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4.5 py-2 text-xs font-mono uppercase font-bold rounded-xl bg-[#EF5B72] hover:bg-[#d84a60] text-white shadow-[0_4px_16px_rgba(239,91,114,0.3)] transition disabled:opacity-50"
            >
              <FlagIcon size={13} />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

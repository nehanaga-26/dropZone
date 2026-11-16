'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Post, LostFoundClaim } from '../../lib/types';
import { dropZoneService } from '../../lib/services/postService';
import { ShieldIcon, SparklesIcon, AlertTriangleIcon, CheckCircleIcon } from '../ui/icons';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onClaimCreated: (claim: LostFoundClaim) => void;
}

export function ClaimModal({ isOpen, onClose, post, onClaimCreated }: ClaimModalProps) {
  const [identifyingDetails, setIdentifyingDetails] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [contactChannel, setContactChannel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  if (!post) return null;

  const currentUser = dropZoneService.getCurrentUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (post.authorId === currentUser.id) {
      setErrorMsg('You cannot initiate a claim on an item you published yourself.');
      return;
    }

    if (!identifyingDetails.trim()) {
      setErrorMsg('Please describe identifying characteristics privately for the finder.');
      return;
    }

    setIsSubmitting(true);
    try {
      const claim = await dropZoneService.createClaim({
        postId: post.id,
        initialClaimantMessage: `${identifyingDetails.trim()}${
          contactChannel ? ` (Contact: ${contactChannel})` : ''
        }`,
      });

      setSuccessMsg(true);
      setTimeout(() => {
        onClaimCreated(claim);
        onClose();
        setSuccessMsg(false);
        setIdentifyingDetails('');
        setContactChannel('');
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Initiate Private Item Claim"
      subtitle="SECURE 1-ON-1 COMMUNICATION CHANNEL // ZERO PUBLIC LEAKS"
      maxWidth="md"
    >
      {successMsg ? (
        <div className="py-10 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircleIcon size={24} />
          </div>
          <h4 className="text-base font-bold text-[#172B4D]">Private Claim Established!</h4>
          <p className="text-xs text-[#71819A]">
            A private conversation thread has been opened with the finder. They have been notified.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangleIcon size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Privacy reassurance alert */}
          <div className="p-3 rounded-2xl bg-[#F0F4FA] border border-[#809DC4]/25 flex items-start gap-2.5 text-xs text-[#172B4D]">
            <ShieldIcon size={18} className="text-[#248BFF] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-semibold">Confidentiality Guarantee:</strong>
              <p className="text-[11px] text-[#71819A] leading-relaxed">
                Your identifying statements and serial numbers are strictly private between you and the post finder. They will never be visible on public feeds.
              </p>
            </div>
          </div>

          <div>
            <span className="text-xs font-mono text-[#71819A]">Target Item:</span>
            <h5 className="text-sm font-bold text-[#172B4D]">{post.title}</h5>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#71819A] mb-1">
              Private Identifying Details <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={identifyingDetails}
              onChange={(e) => setIdentifyingDetails(e.target.value)}
              placeholder="e.g. Keychain has a blue mini-carabiner, sticker on the back says 'HACK24', lock screen photo is a golden retriever..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#809DC4]/30 text-xs text-[#172B4D] outline-none focus:border-[#248BFF] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#71819A] mb-1">
              Preferred Handover / Contact Hint <span className="font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={contactChannel}
              onChange={(e) => setContactChannel(e.target.value)}
              placeholder="e.g. In room 402 until 6 PM, or Discord handle"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#809DC4]/30 text-xs text-[#172B4D] outline-none focus:border-[#248BFF] transition"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-[#809DC4]/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#71819A] hover:bg-[#F0F4FA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white text-xs font-bold shadow-sm hover:opacity-95 transition flex items-center gap-1.5"
            >
              <SparklesIcon size={14} />
              <span>{isSubmitting ? 'Sending Request...' : 'Send Private Claim'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { LostFoundClaim, ClaimStatus, Post, ClaimMessage } from '../../lib/types';
import { dropZoneService } from '../../lib/services/postService';
import {
  ShieldIcon,
  SparklesIcon,
  PaperclipIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
} from '../ui/icons';

interface PrivateClaimChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimId: string | null;
  onClaimUpdated?: (updatedClaim: LostFoundClaim) => void;
}

export function PrivateClaimChatModal({
  isOpen,
  onClose,
  claimId,
  onClaimUpdated,
}: PrivateClaimChatModalProps) {
  const [claim, setClaim] = useState<LostFoundClaim | null>(null);
  const [messages, setMessages] = useState<ClaimMessage[]>([]);
  const [post, setPost] = useState<Post | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [evidenceName, setEvidenceName] = useState<string | null>(null);
  const [evidenceDataUrl, setEvidenceDataUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentUser = dropZoneService.getCurrentUser();

  const loadClaimData = async () => {
    if (!claimId) return;
    try {
      const res = await dropZoneService.getClaim(claimId, currentUser);
      if (res) {
        setClaim({ ...res.claim });
        setMessages(res.messages);
        setPost(res.post || null);
        setErrorMsg(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unauthorized: cannot access this private claim.');
    }
  };

  useEffect(() => {
    if (isOpen && claimId) {
      loadClaimData();
    }
  }, [isOpen, claimId]);

  if (!isOpen || !claimId) return null;

  const isFinder = claim?.finderId === currentUser.id;
  const isClaimant = claim?.claimantId === currentUser.id;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !evidenceDataUrl) return;

    setIsSending(true);
    setErrorMsg(null);
    try {
      await dropZoneService.sendClaimMessage(
        claimId,
        newMessage.trim() || 'Attached supporting evidence photo.',
        currentUser,
        evidenceDataUrl
          ? {
              fileName: evidenceName || 'evidence.png',
              fileType: 'image/png',
              dataUrl: evidenceDataUrl,
            }
          : undefined
      );
      setNewMessage('');
      setEvidenceName(null);
      setEvidenceDataUrl(null);
      await loadClaimData();
      if (claim && onClaimUpdated) onClaimUpdated(claim);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Attachment must be under 2MB.');
        return;
      }
      setEvidenceName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEvidenceDataUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStatusChange = async (newStatus: ClaimStatus) => {
    try {
      const updated = await dropZoneService.updateClaimStatus(claimId, newStatus, currentUser);
      setClaim({ ...updated });
      await loadClaimData();
      if (onClaimUpdated) onClaimUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update claim status.');
    }
  };

  const effectiveStatus = claim?.status === 'pending' ? 'claim_pending' : (claim?.status || 'claim_pending');

  const statusBadgeColor = {
    claim_pending: 'bg-amber-100 text-amber-800 border-amber-300',
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    approved: 'bg-blue-100 text-blue-800 border-blue-300',
    rejected: 'bg-rose-100 text-rose-800 border-rose-300',
    returned: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    closed: 'bg-slate-100 text-slate-800 border-slate-300',
  }[effectiveStatus] || 'bg-amber-100 text-amber-800 border-amber-300';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Private Lost & Found Investigation"
      subtitle={`CLAIM ID: ${claim?.id || '...'} // END-TO-END CONFIDENTIAL`}
      maxWidth="lg"
    >
      {errorMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangleIcon size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {claim && (
        <div className="space-y-4">
          {/* Item & Status Header */}
          <div className="p-4 rounded-2xl bg-white border border-[#809DC4]/25 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono text-[#71819A] uppercase tracking-wider">
                  Associated Item
                </span>
                <h4 className="text-base font-bold text-[#172B4D]">{post?.title || claim.itemTitle || 'Unknown Item'}</h4>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border uppercase ${statusBadgeColor}`}>
                  {effectiveStatus.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-mono text-[#71819A]">
                  Started {new Date(claim.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Participants Bar */}
            <div className="pt-2 border-t border-[#809DC4]/20 flex items-center justify-between text-xs text-[#71819A]">
              <div>
                Claimant: <strong className="text-[#172B4D]">{claim.claimantName}</strong> ({claim.claimantId})
                {isClaimant && <span className="ml-1 text-[#248BFF] font-bold">(You)</span>}
              </div>
              <div>
                Finder: <strong className="text-[#172B4D]">{claim.finderName}</strong> ({claim.finderId})
                {isFinder && <span className="ml-1 text-[#248BFF] font-bold">(You)</span>}
              </div>
            </div>
          </div>

          {/* Action Bar based on Role */}
          <div className="p-3 rounded-2xl bg-[#F0F4FA] border border-[#809DC4]/25 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#172B4D] text-xs">Claim Workflow Controls:</span>

            <div className="flex items-center gap-2">
              {isFinder && (claim.status === 'pending' || (claim.status as any) === 'claim_pending') && (
                <>
                  <button
                    onClick={() => handleStatusChange('approved')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition flex items-center gap-1 shadow-xs"
                  >
                    <CheckCircleIcon size={14} />
                    <span>Approve Claim</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange('rejected')}
                    className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition flex items-center gap-1 shadow-xs"
                  >
                    <XCircleIcon size={14} />
                    <span>Reject Claim</span>
                  </button>
                </>
              )}

              {claim.status === 'approved' && (
                <button
                  onClick={() => handleStatusChange('returned')}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white font-bold hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircleIcon size={14} />
                  <span>Mark Item Returned (Handover Done)</span>
                </button>
              )}

              {claim.status === 'returned' && (
                <button
                  onClick={() => handleStatusChange('closed')}
                  className="px-3 py-1.5 rounded-xl bg-slate-600 text-white font-bold hover:bg-slate-700 transition"
                >
                  Close & Archive Thread
                </button>
              )}
            </div>
          </div>

          {/* Messages Thread */}
          <div className="h-64 overflow-y-auto space-y-3 p-3 rounded-2xl bg-white border border-[#809DC4]/25">
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-[#71819A]">
                    <span className="font-semibold">{msg.senderName}</span>
                    <span>•</span>
                    <span className="font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs space-y-2 ${
                      isMe
                        ? 'bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white rounded-tr-xs'
                        : 'bg-[#F0F4FA] text-[#172B4D] border border-[#809DC4]/20 rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>

                    {/* Attached Evidence Preview */}
                    {(msg.attachment?.dataUrl || msg.attachmentUrl) && (
                      <div className="pt-2 border-t border-white/20">
                        <div className="text-[10px] font-mono flex items-center gap-1 mb-1 opacity-90">
                          <PaperclipIcon size={12} />
                          <span>Confidential Evidence: {msg.attachment?.fileName || msg.attachmentName || 'Photo'}</span>
                        </div>
                        <img
                          src={msg.attachment?.dataUrl || msg.attachmentUrl}
                          alt="Private proof"
                          className="max-h-36 rounded-xl border border-white/30 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Input & Evidence Attachment */}
          {claim.status !== 'closed' ? (
            <form onSubmit={handleSendMessage} className="space-y-2">
              {evidenceName && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs">
                  <div className="flex items-center gap-1.5 font-mono">
                    <PaperclipIcon size={14} />
                    <span>Attached: {evidenceName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceName(null);
                      setEvidenceDataUrl(null);
                    }}
                    className="text-xs font-bold hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <label
                  className="p-2.5 rounded-xl border border-[#809DC4]/30 hover:bg-[#F0F4FA] cursor-pointer text-[#71819A] hover:text-[#248BFF] transition shrink-0"
                  title="Attach confidential photo or receipt"
                >
                  <PaperclipIcon size={16} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a private message or clarify distinctive markings..."
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-white border border-[#809DC4]/30 text-xs text-[#172B4D] placeholder:text-[#809DC4] outline-none focus:border-[#248BFF] transition"
                />

                <button
                  type="submit"
                  disabled={isSending || (!newMessage.trim() && !evidenceDataUrl)}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white text-xs font-bold hover:opacity-95 transition disabled:opacity-40 shrink-0"
                >
                  Send
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 text-center text-xs text-[#71819A] bg-[#F0F4FA] rounded-2xl">
              This private claim has been closed and archived.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

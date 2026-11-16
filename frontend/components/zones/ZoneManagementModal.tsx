'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Zone, ZoneAuditRecord, EditZoneInput, ExtendZoneInput } from '../../lib/types';
import { dropZoneService } from '../../lib/services/postService';
import {
  ClockIcon,
  EditIcon,
  ShieldIcon,
  AlertTriangleIcon,
  HistoryIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
} from '../ui/icons';

interface ZoneManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: Zone | null;
  onZoneUpdated: (updatedZone: Zone) => void;
}

export function ZoneManagementModal({ isOpen, onClose, zone, onZoneUpdated }: ZoneManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'extend' | 'lifecycle' | 'history'>('edit');
  const [currentUser, setCurrentUser] = useState(dropZoneService.getCurrentUser());
  const [userRole, setUserRole] = useState<'owner' | 'moderator' | 'member' | 'visitor'>('visitor');

  // Edit fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(250);

  // Extend fields
  const [extendOption, setExtendOption] = useState<'3h' | '12h' | '1d' | 'custom'>('3h');
  const [customExtensionDate, setCustomExtensionDate] = useState('');

  // History state
  const [auditLogs, setAuditLogs] = useState<ZoneAuditRecord[]>([]);

  // Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (zone && isOpen) {
      setName(zone.name);
      setDescription(zone.description || '');
      setCoverImage(zone.coverImage || '');
      setRadiusMeters(zone.radiusMeters);
      const user = dropZoneService.getCurrentUser();
      setCurrentUser(user);
      const role = dropZoneService.getUserRoleInZone(zone.id, user.id);
      setUserRole(role);
      setAuditLogs(dropZoneService.listZoneAuditHistory(zone.id));
      setFeedbackMsg(null);

      // Default custom date to 2 days from now
      const defaultDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16);
      setCustomExtensionDate(defaultDate);
    }
  }, [zone, isOpen]);

  const [proposedExpiry, setProposedExpiry] = useState<string>('');

  useEffect(() => {
    if (!zone) return;
    const currentExpiry = new Date(zone.expiresAt).getTime();
    const baseTime = Math.max(currentExpiry, Date.now());
    let addedMs = 3 * 3600 * 1000;
    if (extendOption === '12h') addedMs = 12 * 3600 * 1000;
    if (extendOption === '1d') addedMs = 24 * 3600 * 1000;
    if (extendOption === 'custom' && customExtensionDate) {
      const d = new Date(customExtensionDate).getTime();
      setProposedExpiry(isNaN(d) ? 'Invalid Date' : new Date(d).toLocaleString());
      return;
    }
    setProposedExpiry(new Date(baseTime + addedMs).toLocaleString());
  }, [zone, extendOption, customExtensionDate]);

  if (!isOpen || !zone) return null;

  const isOwner = userRole === 'owner';

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      setFeedbackMsg({ type: 'error', text: 'Unauthorized: Only the Zone Owner can edit zone specifications.' });
      return;
    }
    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const input: EditZoneInput = {
        name: name.trim(),
        description: description.trim(),
        coverImage: coverImage || undefined,
        radiusMeters: Number(radiusMeters),
      };
      const updated = await dropZoneService.editZone(zone.id, input);
      setFeedbackMsg({ type: 'success', text: 'Zone details saved successfully (expiration timestamp preserved).' });
      onZoneUpdated(updated);
      setAuditLogs(dropZoneService.listZoneAuditHistory(zone.id));
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update zone.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      setFeedbackMsg({ type: 'error', text: 'Unauthorized: Only the Zone Owner can extend zone duration.' });
      return;
    }
    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const input: ExtendZoneInput = {
        extensionPreset: extendOption !== 'custom' ? extendOption : undefined,
        customNewExpiresAt: extendOption === 'custom' ? new Date(customExtensionDate).toISOString() : undefined,
      };
      const updated = await dropZoneService.extendZone(zone.id, input);
      setFeedbackMsg({ type: 'success', text: `Zone extended successfully! New expiration: ${new Date(updated.expiresAt).toLocaleString()}` });
      onZoneUpdated(updated);
      setAuditLogs(dropZoneService.listZoneAuditHistory(zone.id));
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to extend zone.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!isOwner) {
      setFeedbackMsg({ type: 'error', text: 'Unauthorized: Only the Zone Owner can deactivate the zone.' });
      return;
    }
    if (!confirm('Are you sure you want to deactivate this zone? It will stop accepting new drops.')) return;
    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const updated = await dropZoneService.deactivateZone(zone.id);
      setFeedbackMsg({ type: 'success', text: 'Zone deactivated successfully.' });
      onZoneUpdated(updated);
      setAuditLogs(dropZoneService.listZoneAuditHistory(zone.id));
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to deactivate zone.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    if (!isOwner) {
      setFeedbackMsg({ type: 'error', text: 'Unauthorized: Only the Zone Owner can reactivate this zone.' });
      return;
    }
    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const updated = await dropZoneService.reactivateZone(zone.id);
      setFeedbackMsg({ type: 'success', text: 'Zone reactivated successfully!' });
      onZoneUpdated(updated);
      setAuditLogs(dropZoneService.listZoneAuditHistory(zone.id));
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to reactivate zone.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Zone — ${zone.name}`}
      subtitle={`STATUS: ${zone.status.toUpperCase()} // ROLE: ${userRole.toUpperCase()}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Permission Bar */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F0F4FA] border border-[#809DC4]/20 text-xs">
          <div className="flex items-center gap-2">
            <ShieldIcon size={16} className={isOwner ? 'text-[#248BFF]' : 'text-amber-500'} />
            <span className="text-[#172B4D]">
              Account: <strong className="font-semibold">{currentUser.displayName}</strong> ({currentUser.handle})
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
            isOwner ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
          }`}>
            Zone {userRole}
          </span>
        </div>

        {feedbackMsg && (
          <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            {feedbackMsg.type === 'success' ? <CheckCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#809DC4]/20 gap-2">
          <button
            onClick={() => { setActiveTab('edit'); setFeedbackMsg(null); }}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'edit'
                ? 'border-[#248BFF] text-[#248BFF]'
                : 'border-transparent text-[#71819A] hover:text-[#172B4D]'
            }`}
          >
            <EditIcon size={14} />
            <span>Edit Details</span>
          </button>
          <button
            onClick={() => { setActiveTab('extend'); setFeedbackMsg(null); }}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'extend'
                ? 'border-[#248BFF] text-[#248BFF]'
                : 'border-transparent text-[#71819A] hover:text-[#172B4D]'
            }`}
          >
            <ClockIcon size={14} />
            <span>Extend Duration</span>
          </button>
          <button
            onClick={() => { setActiveTab('lifecycle'); setFeedbackMsg(null); }}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'lifecycle'
                ? 'border-[#248BFF] text-[#248BFF]'
                : 'border-transparent text-[#71819A] hover:text-[#172B4D]'
            }`}
          >
            <ShieldIcon size={14} />
            <span>Lifecycle & Status</span>
          </button>
          <button
            onClick={() => { setActiveTab('history'); setFeedbackMsg(null); }}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'history'
                ? 'border-[#248BFF] text-[#248BFF]'
                : 'border-transparent text-[#71819A] hover:text-[#172B4D]'
            }`}
          >
            <HistoryIcon size={14} />
            <span>Audit History</span>
          </button>
        </div>

        {/* TAB 1: Edit Details */}
        {activeTab === 'edit' && (
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            {!isOwner && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangleIcon size={15} />
                <span>Read-only: Switch to the Zone Owner persona ({zone.ownerId}) to edit.</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#71819A] uppercase mb-1">Zone Name</label>
              <input
                type="text"
                disabled={!isOwner || isSubmitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#809DC4]/30 text-xs text-[#172B4D] outline-none disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#71819A] uppercase mb-1">Description</label>
              <textarea
                rows={2}
                disabled={!isOwner || isSubmitting}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={280}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#809DC4]/30 text-xs text-[#172B4D] outline-none disabled:bg-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#71819A] uppercase mb-1">Radius (Meters)</label>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  disabled={!isOwner || isSubmitting}
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#809DC4]/30 text-xs font-mono text-[#172B4D] outline-none disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#71819A] uppercase mb-1">Current Expiration</label>
                <div className="px-3 py-2 rounded-xl bg-[#F0F4FA] border border-[#809DC4]/20 text-xs font-mono text-[#248BFF] font-semibold">
                  {new Date(zone.expiresAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={!isOwner || isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#248BFF] text-white text-xs font-bold hover:bg-[#1C75DB] transition disabled:opacity-40"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Extend Duration */}
        {activeTab === 'extend' && (
          <form onSubmit={handleExtendSubmit} className="space-y-4 pt-2">
            {!isOwner && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangleIcon size={15} />
                <span>Read-only: Switch to Zone Owner ({zone.ownerId}) to extend zone duration.</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#71819A] uppercase mb-2">Extension Increment</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: '3h', label: '+3 Hours' },
                  { id: '12h', label: '+12 Hours' },
                  { id: '1d', label: '+1 Day' },
                  { id: 'custom', label: 'Custom Date' },
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setExtendOption(opt.id as any)}
                    className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition ${
                      extendOption === opt.id
                        ? 'border-[#248BFF] bg-[#248BFF]/10 text-[#248BFF]'
                        : 'border-[#809DC4]/30 bg-white text-[#172B4D] hover:bg-[#F0F4FA]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {extendOption === 'custom' && (
              <div>
                <label className="block text-xs font-semibold text-[#71819A] uppercase mb-1">Pick Future Expiry Date & Time</label>
                <input
                  type="datetime-local"
                  disabled={!isOwner || isSubmitting}
                  value={customExtensionDate}
                  onChange={(e) => setCustomExtensionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#809DC4]/30 text-xs font-mono text-[#172B4D] outline-none"
                />
              </div>
            )}

            {/* Proposed preview */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-[#172B4D]">Proposed New Expiration:</span>
              <span className="font-mono font-bold text-[#248BFF]">{proposedExpiry}</span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={!isOwner || isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white text-xs font-bold hover:opacity-95 transition disabled:opacity-40"
              >
                {isSubmitting ? 'Extending...' : 'Confirm Extension'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: Lifecycle & Status */}
        {activeTab === 'lifecycle' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-white border border-[#809DC4]/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#172B4D]">Current Zone Lifecycle State</h4>
                  <p className="text-xs text-[#71819A]">
                    Created on {new Date(zone.createdAt).toLocaleString()} by {zone.ownerId}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  zone.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : zone.status === 'expired'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {zone.status}
                </span>
              </div>

              <div className="text-xs text-[#71819A] border-t border-[#809DC4]/20 pt-3 space-y-1">
                <p>• <strong>Active:</strong> Accepts new drops, claims, comments, and member activities.</p>
                <p>• <strong>Expired / Deactivated:</strong> Read-only mode. No new drops or comments accepted.</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F0F4FA] border border-[#809DC4]/20">
              <div>
                <h5 className="text-xs font-bold text-[#172B4D]">
                  {zone.status === 'active' ? 'Deactivate Zone' : 'Explicit Reactivate'}
                </h5>
                <p className="text-[11px] text-[#71819A]">
                  {zone.status === 'active'
                    ? 'Temporarily close this zone to prevent new posts while preserving existing data.'
                    : 'Re-open this zone and renew its operational timer for authorized community access.'}
                </p>
              </div>

              {zone.status === 'active' ? (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={!isOwner || isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition disabled:opacity-40"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReactivate}
                  disabled={!isOwner || isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-40 flex items-center gap-1.5"
                >
                  <RefreshCwIcon size={14} />
                  <span>Reactivate Zone</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Audit History */}
        {activeTab === 'history' && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-[#71819A]">
              <span>Immutable Zone Management Log</span>
              <span>{auditLogs.length} events recorded</span>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#71819A]">No management events recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-white border border-[#809DC4]/25 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#172B4D] uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-[#F0F4FA] text-[#248BFF]">
                        {log.action.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-[#71819A]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#172B4D] font-medium">{log.description || log.summary}</p>
                    <p className="text-[10px] text-[#71819A]">Actor ID: {log.actorId}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

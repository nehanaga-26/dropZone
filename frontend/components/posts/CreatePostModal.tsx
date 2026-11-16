'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Zone, PostCategory, TTLHours, CreatePostInput } from '../../lib/types';
import { ClockIcon, CheckIcon, SparklesIcon } from '../ui/icons';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentZone: Zone | null;
  onPostCreated: () => void;
  initialCategory?: PostCategory;
  createPostFn: (input: CreatePostInput) => Promise<any>;
}

export function CreatePostModal({
  isOpen,
  onClose,
  currentZone,
  onPostCreated,
  initialCategory = 'feed',
  createPostFn,
}: CreatePostModalProps) {
  const [category, setCategory] = useState<PostCategory>(initialCategory);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [ttlHours, setTtlHours] = useState<TTLHours>(6);
  const [tagInput, setTagInput] = useState('');
  const [radiusM, setRadiusM] = useState<number | null>(null);

  // Lost & Found specific state
  const [itemType, setItemType] = useState<'lost' | 'found'>('lost');
  const [contactHint, setContactHint] = useState('');

  // Team Match specific state
  const [skillsNeeded, setSkillsNeeded] = useState('');
  const [teamSize, setTeamSize] = useState('2 / 4 members');

  // UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  // Synchronize category if initialCategory changes
  React.useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setErrorMsg(null);
      setSuccessMsg(false);
    }
  }, [isOpen, initialCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentZone) {
      setErrorMsg('You must be inside an active test zone to create a drop.');
      return;
    }

    if (currentZone.status !== 'active') {
      setErrorMsg('Cannot create drop: This spatial zone is expired or deactivated.');
      return;
    }

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

      const payload: CreatePostInput = {
        zoneId: currentZone.id,
        category,
        title: title.trim(),
        content: content.trim(),
        ttlHours,
        tags: parsedTags,
        radiusM,
        metadata:
          category === 'lost_found'
            ? { itemType, contactHint: contactHint.trim() }
            : category === 'team_match'
            ? {
                skillsNeeded: skillsNeeded
                  .split(',')
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0),
                teamSize,
              }
            : undefined,
      };

      await createPostFn(payload);

      setSuccessMsg(true);
      setTimeout(() => {
        setTitle('');
        setContent('');
        setTagInput('');
        setContactHint('');
        setSkillsNeeded('');
        setRadiusM(null);
        setIsSubmitting(false);
        setSuccessMsg(false);
        onPostCreated();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to broadcast drop. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Ephemeral Drop"
      subtitle={
        currentZone
          ? `Broadcasting to geofence: ${currentZone.name}`
          : 'Geofence required'
      }
      maxWidth="md"
    >
      {successMsg ? (
        <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E8FAF4] text-[#17B890] border border-[#17B890]/40 flex items-center justify-center shadow-[0_6px_20px_rgba(23,184,144,0.2)] animate-bounce">
            <CheckIcon size={24} />
          </div>
          <h3 className="text-base font-bold text-[#172B4D]">Drop Broadcasted!</h3>
            <p className="text-xs text-[#71819A] max-w-xs font-mono">
              Active in {currentZone?.name} with a self-destruct timer of {ttlHours} hours
              {radiusM !== null ? `, visible within ${radiusM}m of the zone centre` : ', visible across the whole zone'}.
            </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-[#FEEFF1] border border-[#EF5B72]/40 text-[#D83852] text-xs font-mono">
              {errorMsg}
            </div>
          )}

          {/* Category selection */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider font-semibold text-[#71819A] mb-1.5">
              Target Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'feed', label: 'Zone Feed', activeClass: 'border-[#248BFF] text-[#248BFF] bg-[#E8F4FF] shadow-xs' },
                  { id: 'lost_found', label: 'Lost & Found', activeClass: 'border-[#F4A340] text-[#D48220] bg-[#FEF5E9] shadow-xs' },
                  { id: 'team_match', label: 'Team Match', activeClass: 'border-[#8B78F6] text-[#7A63F4] bg-[#F2EFFE] shadow-xs' },
                ] as const
              ).map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`py-2 px-3 rounded-2xl text-xs font-bold border transition text-center ${
                    category === cat.id
                      ? `${cat.activeClass}`
                      : 'bg-white border-[#809DC4]/25 text-[#71819A] hover:text-[#172B4D] hover:bg-[#F5F9FF]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="post-title" className="block text-xs font-mono uppercase tracking-wider font-semibold text-[#71819A] mb-1">
              Drop Title *
            </label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                category === 'feed'
                  ? 'e.g. Free coffee and mentoring round in Room 102'
                  : category === 'lost_found'
                  ? 'e.g. Found black hydroflask near central fountain'
                  : 'e.g. Looking for React / UI designer for FinTech pitch'
              }
              className="w-full text-xs bg-white text-[#172B4D] border border-[#809DC4]/30 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#248BFF] focus:ring-2 focus:ring-[#248BFF]/15 placeholder-[#9AA8BC] shadow-2xs"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="post-content" className="block text-xs font-mono uppercase tracking-wider font-semibold text-[#71819A] mb-1">
              Description *
            </label>
            <textarea
              id="post-content"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide clear, concise details for peers in this geofence..."
              className="w-full text-xs bg-white text-[#172B4D] border border-[#809DC4]/30 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#248BFF] focus:ring-2 focus:ring-[#248BFF]/15 placeholder-[#9AA8BC] resize-none shadow-2xs"
              required
            />
          </div>

          {/* Category specific fields */}
          {category === 'lost_found' && (
            <div className="p-3.5 rounded-2xl bg-[#F5F9FF] border border-[#809DC4]/20 space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#71819A] mb-1.5 font-semibold">
                  Item Status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setItemType('lost')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                      itemType === 'lost'
                        ? 'bg-[#FEEFF1] border-[#EF5B72]/60 text-[#D83852] shadow-2xs'
                        : 'bg-white border-[#809DC4]/20 text-[#71819A]'
                    }`}
                  >
                    I Lost an Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemType('found')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                      itemType === 'found'
                        ? 'bg-[#E8FAF4] border-[#17B890]/60 text-[#139B79] shadow-2xs'
                        : 'bg-white border-[#809DC4]/20 text-[#71819A]'
                    }`}
                  >
                    I Found an Item
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="contact-hint" className="block text-[11px] font-mono uppercase text-[#71819A] mb-1 font-semibold">
                  Claim / Return Instruction
                </label>
                <input
                  id="contact-hint"
                  type="text"
                  value={contactHint}
                  onChange={(e) => setContactHint(e.target.value)}
                  placeholder="e.g. Left with Volunteer Desk #2 under the banner"
                  className="w-full text-xs bg-white text-[#172B4D] border border-[#809DC4]/25 rounded-lg px-3 py-2 focus:outline-none focus:border-[#248BFF] placeholder-[#9AA8BC]"
                />
              </div>
            </div>
          )}

          {category === 'team_match' && (
            <div className="p-3.5 rounded-2xl bg-[#F8F6FF] border border-[#8B78F6]/20 space-y-3">
              <div>
                <label htmlFor="skills-needed" className="block text-[11px] font-mono uppercase text-[#71819A] mb-1 font-semibold">
                  Skills / Roles Needed (comma-separated)
                </label>
                <input
                  id="skills-needed"
                  type="text"
                  value={skillsNeeded}
                  onChange={(e) => setSkillsNeeded(e.target.value)}
                  placeholder="e.g. Next.js, Figma, Python, Pitch Deck"
                  className="w-full text-xs bg-white text-[#172B4D] border border-[#8B78F6]/25 rounded-lg px-3 py-2 focus:outline-none focus:border-[#8B78F6] placeholder-[#9AA8BC]"
                />
              </div>

              <div>
                <label htmlFor="team-size" className="block text-[11px] font-mono uppercase text-[#71819A] mb-1 font-semibold">
                  Current Team Size
                </label>
                <input
                  id="team-size"
                  type="text"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  placeholder="e.g. 2 / 4 members"
                  className="w-full text-xs bg-white text-[#172B4D] border border-[#8B78F6]/25 rounded-lg px-3 py-2 focus:outline-none focus:border-[#8B78F6] placeholder-[#9AA8BC]"
                />
              </div>
            </div>
          )}

          {/* Time to Live (TTL) Selector Cards */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono uppercase tracking-wider font-semibold text-[#71819A] flex items-center gap-1.5">
                <ClockIcon size={14} className="text-[#F4A340]" />
                <span>Content Expiry (TTL)</span>
              </label>
              <span className="text-[10px] font-mono text-[#D48220]">Auto-Purge Expiration</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { hours: 1 as TTLHours, label: '1 hour', hint: 'Quick meetup' },
                  { hours: 6 as TTLHours, label: '6 hours', hint: 'Hack sprint' },
                  { hours: 24 as TTLHours, label: '24 hours', hint: 'Daily' },
                  { hours: 72 as TTLHours, label: '3 days', hint: 'Teammates' },
                ] as const
              ).map((opt) => (
                <button
                  type="button"
                  key={opt.hours}
                  onClick={() => setTtlHours(opt.hours)}
                  className={`py-2 px-1.5 rounded-2xl text-center border transition-all flex flex-col items-center justify-center ${
                    ttlHours === opt.hours
                      ? 'bg-[#E8F4FF] border-[#248BFF] text-[#248BFF] shadow-[0_4px_12px_rgba(36,139,255,0.18)]'
                      : 'bg-white border-[#809DC4]/25 text-[#71819A] hover:text-[#172B4D] hover:bg-[#F5F9FF]'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">{opt.label}</span>
                  <span className="text-[9px] text-[#9AA8BC] line-clamp-1">{opt.hint}</span>
                </button>
              ))}
            </div>

            <p className="text-[10px] font-mono text-[#71819A] mt-1.5">
              Your drop is intended to expire after the selected duration.
            </p>
          </div>

          {/* Visible radius: who can see this drop */}
          <div>
            <label
              htmlFor="post-radius"
              className="block text-xs font-mono uppercase tracking-wider font-semibold text-[#71819A] mb-1"
            >
              Visible Within
            </label>
            <select
              id="post-radius"
              value={radiusM === null ? '' : String(radiusM)}
              onChange={(e) => setRadiusM(e.target.value === '' ? null : Number(e.target.value))}
              className="w-full text-xs bg-white text-[#172B4D] border border-[#809DC4]/30 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#248BFF] shadow-2xs"
            >
              <option value="">
                Whole zone{currentZone ? ` (${currentZone.radiusMeters}m)` : ''}
              </option>
              <option value="50">Nearby · 50m</option>
              <option value="100">Close · 100m</option>
              <option value="250">Walking · 250m</option>
              <option value="500">Wide · 500m</option>
            </select>
            <p className="text-[10px] font-mono text-[#71819A] mt-1.5">
              Only people inside this radius of the zone centre will see it in their feed.
            </p>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="post-tags" className="block text-xs font-mono uppercase tracking-wider font-semibold text-[#71819A] mb-1">
              Tags (Optional, comma-separated)
            </label>
            <input
              id="post-tags"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. Hardware, Mentors, IoT"
              className="w-full text-xs bg-white text-[#172B4D] border border-[#809DC4]/30 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#248BFF] placeholder-[#9AA8BC] shadow-2xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#809DC4]/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-mono text-[#71819A] hover:text-[#172B4D] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold font-mono uppercase tracking-wider rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white hover:from-[#1A7CEB] hover:to-[#17B7E2] shadow-[0_4px_16px_rgba(36,139,255,0.3)] transition disabled:opacity-50"
            >
              {isSubmitting ? 'Broadcasting...' : 'Broadcast Drop'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

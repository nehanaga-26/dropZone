'use client';

import React from 'react';
import { PostCategory } from '../../lib/types';
import { PlusIcon, FeedIcon, SearchIcon, UsersIcon } from '../ui/icons';

interface EmptyFeedProps {
  category: PostCategory;
  zoneName: string;
  onOpenCreateModal: () => void;
}

export function EmptyFeed({ category, zoneName, onOpenCreateModal }: EmptyFeedProps) {
  const content = {
    feed: {
      title: `No active drops in ${zoneName}`,
      description: 'Be the first person to share an announcement, ask a question, or broadcast an update in this zone.',
      icon: <FeedIcon size={28} className="text-[#248BFF]" />,
      cta: 'Drop the First Post',
    },
    lost_found: {
      title: `No lost or found items in ${zoneName}`,
      description: 'Lost an item, charger, or notes? Broadcast an ephemeral drop with an auto-expiring timer.',
      icon: <SearchIcon size={28} className="text-[#F4A340]" />,
      cta: 'Report Lost or Found Item',
    },
    team_match: {
      title: `No open teammate requests in ${zoneName}`,
      description: 'Looking for developers, designers, or study partners nearby? Post your project track and required skills.',
      icon: <UsersIcon size={28} className="text-[#8B78F6]" />,
      cta: 'Post Teammate Request',
    },
  }[category];

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-[#809DC4]/25 p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4 shadow-[0_10px_30px_rgba(36,139,255,0.05)]">
      <div className="w-16 h-16 rounded-2xl bg-[#E8F4FF] border border-[#248BFF]/20 flex items-center justify-center shadow-inner">
        {content.icon}
      </div>

      <div className="max-w-md space-y-1">
        <h3 className="text-base font-bold text-[#172B4D]">{content.title}</h3>
        <p className="text-xs text-[#71819A] leading-relaxed">{content.description}</p>
      </div>

      <button
        onClick={onOpenCreateModal}
        className="mt-2 inline-flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white shadow-[0_6px_20px_rgba(36,139,255,0.3)] hover:from-[#1A7CEB] hover:to-[#17B7E2] transition"
      >
        <PlusIcon size={16} />
        <span>{content.cta}</span>
      </button>
    </div>
  );
}

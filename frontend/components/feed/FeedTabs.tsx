'use client';

import React from 'react';
import { PostCategory } from '../../lib/types';
import { FeedIcon, SearchIcon, UsersIcon } from '../ui/icons';

interface FeedTabsProps {
  activeTab: PostCategory;
  onTabChange: (tab: PostCategory) => void;
  counts: {
    feed: number;
    lost_found: number;
    team_match: number;
  };
}

export function FeedTabs({ activeTab, onTabChange, counts }: FeedTabsProps) {
  const tabs: {
    id: PostCategory;
    label: string;
    icon: React.ReactNode;
    count: number;
    color: string;
  }[] = [
    {
      id: 'feed',
      label: 'Zone Feed',
      icon: <FeedIcon size={16} />,
      count: counts.feed,
      color: '#248BFF',
    },
    {
      id: 'lost_found',
      label: 'Lost & Found',
      icon: <SearchIcon size={16} />,
      count: counts.lost_found,
      color: '#F4A340',
    },
    {
      id: 'team_match',
      label: 'Team Match',
      icon: <UsersIcon size={16} />,
      count: counts.team_match,
      color: '#8B78F6',
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Feed Heading & Supporting Text */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#172B4D] tracking-tight">
            Your Zone, Right Now
          </h2>
          <p className="text-xs text-[#71819A] mt-0.5">
            Discover people, ideas, and opportunities around you.
          </p>
        </div>
      </div>

      {/* Glass Tab Selector Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/70 backdrop-blur-md border border-[#809DC4]/25 w-full overflow-x-auto shadow-sm">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex-1 justify-center relative ${
                isActive
                  ? 'bg-white text-[#172B4D] border border-[#248BFF]/30 shadow-[0_4px_16px_rgba(36,139,255,0.12)]'
                  : 'text-[#71819A] hover:text-[#172B4D] hover:bg-white/50 border border-transparent'
              }`}
            >
              <span
                style={{ color: isActive ? tab.color : '#71819A' }}
                className="transition-colors"
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full transition-colors ${
                  isActive
                    ? 'bg-[#E8F4FF] text-[#248BFF] font-bold border border-[#248BFF]/20'
                    : 'bg-[#F0F4FA] text-[#71819A]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

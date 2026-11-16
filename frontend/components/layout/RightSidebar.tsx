'use client';

import React, { useState } from 'react';
import { Zone, Post, PostCategory } from '../../lib/types';
import { RadarIcon, ClockIcon, ShieldIcon, SparklesIcon, UsersIcon } from '../ui/icons';
import { Badge } from '../ui/Badge';

interface RightSidebarProps {
  currentZone: Zone | null;
  zonePosts: Post[];
}

export function RightSidebar({ currentZone, zonePosts }: RightSidebarProps) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<PostCategory | 'all'>('all');
  const [newestFirst, setNewestFirst] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Search + filter + sort, then soonest expiries on top
  const visible = zonePosts
    .filter((p) => (cat === 'all' ? true : p.category === cat))
    .filter((p) =>
      query.trim()
        ? (p.title + ' ' + p.content).toLowerCase().includes(query.trim().toLowerCase())
        : true
    )
    .sort((a, b) =>
      newestFirst
        ? new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime()
        : new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
    );
  const expiringSoon = visible.slice(0, expanded ? 8 : 3);

  // Derive counts for the small visual activity breakdown
  const feedCount = zonePosts.filter((p) => p.category === 'feed').length;
  const lostFoundCount = zonePosts.filter((p) => p.category === 'lost_found').length;
  const teamMatchCount = zonePosts.filter((p) => p.category === 'team_match').length;
  const totalPosts = zonePosts.length || 1;

  return (
    <aside className="w-full xl:w-72 shrink-0 flex flex-col gap-5">
      {/* Zone Insights Card */}
      <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-[#809DC4]/25 p-5 shadow-[0_10px_30px_rgba(36,139,255,0.06)] relative overflow-hidden">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#E8F4FF] flex items-center justify-center text-[#248BFF]">
              <SparklesIcon size={14} />
            </div>
            <h3 className="text-xs uppercase tracking-widest font-mono font-bold text-[#172B4D]">
              Zone Insights
            </h3>
          </div>
          <Badge variant="blue" size="sm">LIVE STATS</Badge>
        </div>

        {currentZone ? (
          <div className="space-y-3.5">
            <div>
              <div className="text-sm font-bold text-[#172B4D]">{currentZone.name}</div>
              <p className="text-[11px] text-[#71819A]">Verified campus geofence perimeter</p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-[#F5F9FF] border border-[#809DC4]/20 text-center">
                <div className="text-[10px] font-mono uppercase text-[#71819A]">Simulated Peers</div>
                <div className="text-base font-extrabold text-[#172B4D] mt-0.5">
                  {currentZone.activeUserCount}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#F5F9FF] border border-[#809DC4]/20 text-center">
                <div className="text-[10px] font-mono uppercase text-[#71819A]">Active Drops</div>
                <div className="text-base font-extrabold text-[#248BFF] mt-0.5">
                  {zonePosts.length}
                </div>
              </div>
            </div>

            {/* Decorative Activity Distribution Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#71819A]">
                <span>Channel Distribution</span>
                <span>{zonePosts.length} total</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#E8F4FF] overflow-hidden flex">
                <div
                  style={{ width: `${(feedCount / totalPosts) * 100}%` }}
                  className="h-full bg-[#248BFF] transition-all"
                  title={`Feed: ${feedCount}`}
                />
                <div
                  style={{ width: `${(lostFoundCount / totalPosts) * 100}%` }}
                  className="h-full bg-[#F4A340] transition-all"
                  title={`Lost & Found: ${lostFoundCount}`}
                />
                <div
                  style={{ width: `${(teamMatchCount / totalPosts) * 100}%` }}
                  className="h-full bg-[#8B78F6] transition-all"
                  title={`Team Match: ${teamMatchCount}`}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-[#71819A] pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#248BFF]" /> Feed ({feedCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F4A340]" /> L&F ({lostFoundCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B78F6]" /> Team ({teamMatchCount})
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-xs font-mono text-[#EF5B72]">
            No geofence currently selected
          </div>
        )}
      </div>

      {/* Expiring Soon Card */}
      <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-[#809DC4]/25 p-5 shadow-[0_10px_30px_rgba(36,139,255,0.06)]">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#FEF5E9] flex items-center justify-center text-[#F4A340]">
              <ClockIcon size={14} />
            </div>
            <h3 className="text-xs uppercase tracking-widest font-mono font-bold text-[#172B4D]">
              Expiring Soon
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#D48220] bg-[#FEF5E9] px-2 py-0.5 rounded-full border border-[#F4A340]/30 font-semibold">
            AUTO-PURGE
          </span>
        </div>

        {/* Neat queries: search + category + sort */}
        <div className="flex gap-1.5 mb-2.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search expiring…"
            aria-label="Search expiring posts"
            className="flex-1 min-w-0 text-[11px] bg-white border border-[#809DC4]/25 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#F4A340] placeholder-[#9AA8BC]"
          />
          <button
            onClick={() => setNewestFirst(!newestFirst)}
            title={newestFirst ? 'Sort: latest expiry first' : 'Sort: soonest expiry first'}
            className="text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-xl bg-[#F5F9FF] border border-[#809DC4]/25 text-[#71819A] hover:text-[#172B4D] shrink-0"
          >
            {newestFirst ? '↓ new' : '↑ soon'}
          </button>
        </div>
        <div className="flex gap-1.5 mb-3 flex-wrap" role="tablist" aria-label="Filter by category">
          {(['all', 'feed', 'lost_found', 'team_match'] as const).map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={cat === c}
              onClick={() => setCat(c)}
              className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full border transition ${
                cat === c
                  ? 'bg-[#172B4D] text-white border-[#172B4D]'
                  : 'bg-white text-[#71819A] border-[#809DC4]/25 hover:text-[#172B4D]'
              }`}
            >
              {c === 'all' ? `all (${zonePosts.length})` : c.replace('_', ' ')}
            </button>
          ))}
        </div>

        {expiringSoon.length > 0 ? (
          <div className="space-y-2.5">
            {expiringSoon.map((post) => {
              const diffMs = new Date(post.expiresAt).getTime() - Date.now();
              const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
              const hours = Math.floor(minutes / 60);
              const timeLabel = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

              return (
                <div
                  key={post.id}
                  className="p-3 rounded-2xl bg-[#F5F9FF] border border-[#809DC4]/20 flex flex-col gap-1 hover:border-[#F4A340]/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#172B4D] line-clamp-1">
                      {post.title}
                    </span>
                    <span className="text-[10px] font-mono text-[#D48220] font-bold shrink-0 ml-1.5 bg-[#FEF5E9] px-1.5 py-0.5 rounded border border-[#F4A340]/30">
                      {timeLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#71819A] font-mono">
                    <span className="capitalize">{post.category.replace('_', ' ')}</span>
                    <span>{post.authorHandle}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[#71819A] font-mono text-center py-3">
            {query.trim() || cat !== 'all' ? 'No matches — clear search or filter.' : 'No drops active in this zone'}
          </p>
        )}
        {visible.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2.5 w-full text-[11px] font-mono font-bold text-[#248BFF] hover:underline"
          >
            {expanded ? 'Show less ↑' : `Show more (${visible.length - 3} more) ↓`}
          </button>
        )}
      </div>

      {/* Privacy Status Card */}
      <div className="p-4 rounded-3xl bg-white/70 backdrop-blur-md border border-[#809DC4]/20 text-[11px] text-[#71819A] space-y-1.5">
        <div className="flex items-center gap-1.5 text-[#248BFF] font-mono font-bold text-[10px] uppercase">
          <ShieldIcon size={13} />
          <span>Simulation Mode Verified</span>
        </div>
        <p className="leading-relaxed">
          Zone presence is simulated for evaluation. Real GPS telemetry is never recorded, transmitted, or requested.
        </p>
      </div>
    </aside>
  );
}

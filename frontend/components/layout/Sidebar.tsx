'use client';

import React, { useState, useRef } from 'react';
import { Zone } from '../../lib/types';
import { ShieldIcon, LogOutIcon, RadarIcon, PlusIcon, SettingsIcon, ClockIcon } from '../ui/icons';
import { Badge } from '../ui/Badge';
import { dropZoneService } from '../../lib/services/postService';

interface SidebarProps {
  zones: Zone[];
  activeZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  onLeaveZone: () => void;
  onOpenCreateZone: () => void;
  onOpenManageZone: (zone: Zone) => void;
}

export function Sidebar({
  zones,
  activeZoneId,
  onSelectZone,
  onLeaveZone,
  onOpenCreateZone,
  onOpenManageZone,
}: SidebarProps) {
  const [filterMode, setFilterMode] = useState<'active' | 'archived'>('active');
  const listRef = useRef<HTMLDivElement>(null);
  const currentUser = dropZoneService.getCurrentUser();
  const scrollList = (dir: 1 | -1) =>
    listRef.current?.scrollBy({ top: dir * 260, behavior: 'smooth' });

  const filteredZones = zones.filter((z) => {
    if (filterMode === 'active') return z.status === 'active';
    return z.status === 'expired' || z.status === 'deactivated';
  });

  return (
    <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-5 lg:min-h-0 lg:overflow-y-auto lg:pb-4 lg:pr-1">
      {/* Zone Switcher Card */}
      <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-[#809DC4]/25 p-5 shadow-[0_10px_30px_rgba(36,139,255,0.06)] relative overflow-hidden">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#E8F4FF] flex items-center justify-center text-[#248BFF]">
              <RadarIcon size={14} />
            </div>
            <h2 className="text-xs uppercase tracking-widest font-mono font-bold text-[#172B4D]">
              Campus Zones
            </h2>
          </div>
          <button
            onClick={onOpenCreateZone}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white text-[11px] font-bold shadow-xs hover:opacity-90 transition"
            title="Create a new geofenced spatial zone"
          >
            <PlusIcon size={13} />
            <span>Create</span>
          </button>
        </div>

        {/* Filter Toggle: Active vs Archived */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F0F4FA] border border-[#809DC4]/20 mb-3.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterMode('active')}
            className={`py-1 rounded-lg transition text-center ${
              filterMode === 'active'
                ? 'bg-white text-[#248BFF] shadow-2xs font-bold'
                : 'text-[#71819A] hover:text-[#172B4D]'
            }`}
          >
            Active ({zones.filter((z) => z.status === 'active').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('archived')}
            className={`py-1 rounded-lg transition text-center ${
              filterMode === 'archived'
                ? 'bg-white text-[#248BFF] shadow-2xs font-bold'
                : 'text-[#71819A] hover:text-[#172B4D]'
            }`}
          >
            Archived ({zones.filter((z) => z.status !== 'active').length})
          </button>
        </div>

        {/* Zone List — always scrollable, all zones reachable */}
        <div
          ref={listRef}
          className="flex flex-col gap-2.5 pr-1"
          style={{ maxHeight: 300, overflowY: 'scroll' }}
        >
          {filteredZones.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#71819A] italic">
              {filterMode === 'active' ? 'No active zones available.' : 'No archived zones found.'}
            </div>
          ) : (
            filteredZones.map((zone) => {
              const isActive = activeZoneId === zone.id;
              const isOwner = zone.ownerId === currentUser.id;

              return (
                <div
                  key={zone.id}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col gap-1.5 relative overflow-hidden ${
                    isActive
                      ? 'bg-[#E8F4FF] border-[#248BFF]/45 shadow-[0_4px_16px_rgba(36,139,255,0.12)]'
                      : 'bg-white/70 border-[#809DC4]/20 hover:border-[#248BFF]/30 hover:bg-white'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#248BFF]" />
                  )}

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onSelectZone(zone.id)}
                      className="flex items-center gap-2 text-left min-w-0 flex-1"
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          zone.status === 'active'
                            ? isActive
                              ? 'bg-[#248BFF] shadow-[0_0_8px_rgba(36,139,255,0.5)]'
                              : 'bg-emerald-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span className={`text-xs font-bold truncate ${isActive ? 'text-[#172B4D]' : 'text-[#71819A]'}`}>
                        {zone.name}
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Manage Zone Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenManageZone(zone);
                        }}
                        className="p-1 rounded-lg text-[#71819A] hover:text-[#248BFF] hover:bg-white/90 border border-transparent hover:border-[#809DC4]/20 transition"
                        title="Manage zone specifications & lifecycle"
                      >
                        <SettingsIcon size={14} />
                      </button>

                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold ${
                        zone.status === 'active'
                          ? 'bg-[#E8FAF4] text-[#139B79] border border-[#17B890]/25'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {zone.status === 'active' ? `${zone.activeUserCount || 1} online` : zone.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#71819A] line-clamp-1">{zone.tagline || zone.description}</p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#9AA8BC] mt-0.5">
                    <span className="text-[#248BFF] font-semibold">{zone.radiusMeters}m radius</span>
                    <span className="flex items-center gap-1 text-[#71819A]">
                      <ClockIcon size={10} />
                      <span>Expires {new Date(zone.expiresAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {filteredZones.length > 2 && (
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <button
              onClick={() => scrollList(-1)}
              aria-label="Scroll zones up"
              className="w-8 h-8 rounded-xl bg-white border border-[#809DC4]/25 text-[#248BFF] font-bold hover:border-[#248BFF] transition"
            >
              ▲
            </button>
            <p className="text-[10px] font-mono text-[#248BFF]">
              {filteredZones.length} zones — scroll or use arrows
            </p>
            <button
              onClick={() => scrollList(1)}
              aria-label="Scroll zones down"
              className="w-8 h-8 rounded-xl bg-white border border-[#809DC4]/25 text-[#248BFF] font-bold hover:border-[#248BFF] transition"
            >
              ▼
            </button>
          </div>
        )}

        {/* Leave Zone Button */}
        {activeZoneId && (
          <button
            onClick={onLeaveZone}
            className="w-full mt-3.5 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider text-[#71819A] hover:text-[#EF5B72] py-2.5 rounded-2xl bg-[#F5F9FF] border border-[#809DC4]/25 hover:border-[#EF5B72]/30 hover:bg-[#FEEFF1] transition-all font-medium"
          >
            <LogOutIcon size={14} />
            <span>Leave Zone — wipe my data</span>
          </button>
        )}
      </div>

      {/* Privacy First Information Card */}
      <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-[#809DC4]/25 p-5 shadow-[0_10px_30px_rgba(36,139,255,0.06)]">
        <div className="flex items-center gap-2 text-[#248BFF] mb-3">
          <div className="w-6 h-6 rounded-lg bg-[#E8F4FF] flex items-center justify-center text-[#248BFF]">
            <ShieldIcon size={14} />
          </div>
          <h3 className="text-xs uppercase tracking-widest font-mono font-bold text-[#172B4D]">
            Privacy & Security
          </h3>
        </div>
        <ul className="text-xs text-[#71819A] space-y-2.5 leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-[#248BFF] font-bold">›</span>
            <span>
              <strong className="text-[#172B4D]">Private Claims:</strong> Lost & Found identification details remain confidential.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#F4A340] font-bold">›</span>
            <span>
              <strong className="text-[#172B4D]">10 Unique Reports:</strong> Auto-hides abusive content until moderator review.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#8B78F6] font-bold">›</span>
            <span>
              <strong className="text-[#172B4D]">Independent Timers:</strong> Zone lifecycle, post TTL, and claim records expire separately.
            </span>
          </li>
        </ul>
      </div>
    </aside>
  );
}

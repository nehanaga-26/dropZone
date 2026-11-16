'use client';

import React from 'react';
import Image from 'next/image';
import { Zone } from '../../lib/types';
import { RadioIcon, PlusIcon, MapPinIcon, UsersIcon } from '../ui/icons';
import { Badge } from '../ui/Badge';

interface ZoneStatusBannerProps {
  zone: Zone | null;
  onRejoinZone?: () => void;
  onOpenCreateModal?: () => void;
}

export function ZoneStatusBanner({
  zone,
  onRejoinZone,
  onOpenCreateModal,
}: ZoneStatusBannerProps) {
  if (!zone) {
    return (
      <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-[#EF5B72]/30 p-6 sm:p-7 shadow-[0_10px_30px_rgba(239,91,114,0.08)] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#FEEFF1] text-[#EF5B72] border border-[#EF5B72]/20 shrink-0">
              <RadioIcon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-[#172B4D]">
                  You&apos;re outside an active zone.
                </h2>
                <Badge variant="rose" size="sm">READ-ONLY MODE</Badge>
              </div>
              <p className="text-xs text-[#71819A] mt-1.5 leading-relaxed max-w-xl">
                Join a supported zone to participate in local conversations. Posting and interactions are locked while outside campus geofences to protect student privacy.
              </p>
            </div>
          </div>

          {onRejoinZone && (
            <button
              onClick={onRejoinZone}
              className="px-4.5 py-2.5 rounded-2xl bg-[#EF5B72] hover:bg-[#d84a60] text-white font-mono text-xs font-bold shadow-[0_4px_16px_rgba(239,91,114,0.3)] transition shrink-0"
            >
              Re-enter Default Zone
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#809DC4]/25 shadow-[0_12px_36px_rgba(36,139,255,0.08)] overflow-hidden relative bg-[#172B4D]">
      {/* Campus Photograph Hero Background */}
      <div className="relative h-48 sm:h-56 w-full overflow-hidden">
        <img
          src={zone.coverImage || '/campus_hero_banner.jpg'}
          alt={zone.name}
          className="w-full h-full object-cover object-center scale-105"
        />
        {/* Soft elegant gradient overlays for contrast and brand tint */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#102038]/95 via-[#172B4D]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#172B4D]/80 via-transparent to-[#248BFF]/20" />

        {/* Content Overlaid on Campus Image */}
        <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-between z-10">
          {/* Top geofence badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/30 font-bold">
                📍 {zone.name}
              </span>
              <span className="text-[10px] font-mono text-white/90 bg-[#248BFF]/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20">
                {zone.radiusMeters}m geofence
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/90 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
              <span className="w-2 h-2 rounded-full bg-[#17B890] animate-pulse" />
              <span>{zone.activeUserCount} peers nearby</span>
            </div>
          </div>

          {/* Bottom Title & Supporting Text */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#20C9F8] font-bold">
                Connect. Collaborate. Discover.
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
                {zone.name}
              </h1>
            </div>

            {onOpenCreateModal && (
              <button
                onClick={onOpenCreateModal}
                className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] hover:from-[#1A7CEB] hover:to-[#17B7E2] text-white font-bold text-xs shadow-[0_6px_20px_rgba(36,139,255,0.4)] transition shrink-0 self-start sm:self-auto"
              >
                <PlusIcon size={16} />
                <span>Drop in {zone.name}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

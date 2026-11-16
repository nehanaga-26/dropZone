'use client';

import React from 'react';
import { Zone } from '../../lib/types';
import { PlusIcon, ShieldIcon } from '../ui/icons';
import Link from 'next/link';

interface MobileNavProps {
  zones: Zone[];
  activeZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  onOpenCreateModal: () => void;
}

export function MobileNav({ zones, activeZoneId, onSelectZone, onOpenCreateModal }: MobileNavProps) {
  return (
    <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/90 backdrop-blur-xl border border-[#809DC4]/30 p-2.5 rounded-2xl shadow-[0_10px_35px_rgba(36,139,255,0.15)]">
      <div className="flex items-center justify-around gap-2 max-w-md mx-auto">
        {/* Zone quick-selector dropdown */}
        <div className="relative flex-1">
          <select
            value={activeZoneId || ''}
            onChange={(e) => onSelectZone(e.target.value)}
            className="w-full text-xs font-mono font-bold bg-[#F5F9FF] text-[#172B4D] border border-[#809DC4]/30 rounded-xl px-3 py-2.5 appearance-none focus:outline-none focus:border-[#248BFF]"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                📍 {z.name} ({z.radiusMeters}m)
              </option>
            ))}
          </select>
        </div>

        {/* Create Drop button */}
        <button
          onClick={onOpenCreateModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white font-bold text-xs shadow-[0_4px_16px_rgba(36,139,255,0.3)] shrink-0"
        >
          <PlusIcon size={16} />
          <span>Drop</span>
        </button>

        {/* Mod Queue Link */}
        <Link
          href="/moderation"
          className="flex items-center justify-center p-2.5 rounded-xl bg-[#F5F9FF] border border-[#809DC4]/30 text-[#8B78F6] shrink-0"
          title="Moderator Queue"
        >
          <ShieldIcon size={18} />
        </Link>
      </div>
    </div>
  );
}

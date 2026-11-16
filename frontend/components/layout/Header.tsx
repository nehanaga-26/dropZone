'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DropZoneLogoMark, PlusIcon, ShieldIcon, RadioIcon, UsersIcon } from '../ui/icons';
import { Zone, UserProfile } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { NotificationCenter } from './NotificationCenter';
import { AuthModal } from '../auth/AuthModal';
import { useAuth } from '../../lib/auth';
import { dropZoneService } from '../../lib/services/postService';

interface HeaderProps {
  currentZone: Zone | null;
  onOpenCreateModal: () => void;
  onOpenClaim?: (claimId: string) => void;
  onUserChanged?: () => void;
}

export function Header({
  currentZone,
  onOpenCreateModal,
  onOpenClaim,
}: HeaderProps) {
  const [currentUser, setCurrentUser] = useState<UserProfile>(dropZoneService.getCurrentUser());
  const [showAuth, setShowAuth] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    setCurrentUser(dropZoneService.getCurrentUser());
  }, []);

  return (
    <header className="sticky top-3 z-40 w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 mb-3">
      <div className="h-16 rounded-2xl bg-white/80 backdrop-blur-xl border border-[#809DC4]/25 shadow-[0_8px_30px_rgba(36,139,255,0.06)] px-4 sm:px-6 flex items-center justify-between gap-4 transition-all">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3.5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8F4FF] to-white border border-[#809DC4]/30 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <DropZoneLogoMark size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider text-[#172B4D] group-hover:text-[#248BFF] transition-colors">
                  DROPZONE
                </span>
                <span className="text-[9px] font-mono uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-[#E8F4FF] text-[#248BFF] border border-[#248BFF]/25">
                  SPATIAL NETWORK
                </span>
              </div>
              <p className="text-[10px] text-[#71819A] font-medium hidden sm:block">
                Privacy-Conscious Campus Geofences
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Current Zone Pill */}
        {currentZone ? (
          <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#F5F9FF] border border-[#809DC4]/30 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#248BFF] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#248BFF]"></span>
              </span>
              <span className="text-[11px] font-mono uppercase text-[#71819A]">Active Geofence:</span>
              <span className="text-xs font-bold text-[#172B4D]">{currentZone.name}</span>
            </div>
            <span className="text-[#809DC4]/40">|</span>
            <span className="text-[11px] font-mono text-[#248BFF] font-semibold">{currentZone.radiusMeters}m radius</span>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEEFF1] border border-[#EF5B72]/30 text-[#D83852] text-xs font-mono font-medium">
            <RadioIcon size={14} />
            <span>OUTSIDE ACTIVE GEOFENCE (READ-ONLY)</span>
          </div>
        )}

        {/* Right Actions: Account, Notification Center, Mod Queue, Create Drop */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Login account info (from sign-up). Click to sign in/out. */}
          {user ? (
            <button
              onClick={() => {
                if (confirm(`Signed in as ${user.email}. Sign out?`)) signOut();
              }}
              title={`Verified session: ${user.email}. Click to sign out.`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#E8FAF4] border border-[#17B890]/35 text-[#172B4D] text-xs shadow-2xs hover:border-[#139B79] transition"
            >
              <div className="w-5 h-5 rounded-full bg-[#139B79] text-white text-[9px] font-bold flex items-center justify-center font-mono">
                {(user.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="text-left hidden md:block">
                <div className="font-bold text-[11px] leading-tight">
                  <span>{user.email?.split('@')[0]}</span>
                </div>
                <div className="text-[9px] text-[#139B79] font-mono leading-none font-bold">
                  ✓ Verified account
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#F0F4FA] border border-[#809DC4]/30 text-[#172B4D] text-xs shadow-2xs hover:border-[#248BFF]/40 transition"
              title="Sign up or sign in with email"
            >
              <div className="w-5 h-5 rounded-full bg-[#248BFF] text-white text-[9px] font-bold flex items-center justify-center font-mono">
                {currentUser.avatarSeed}
              </div>
              <div className="text-left hidden md:block">
                <div className="font-bold text-[11px] leading-tight">
                  <span>{currentUser.displayName}</span>
                </div>
                <div className="text-[9px] text-[#248BFF] font-mono leading-none font-bold">
                  Sign in →
                </div>
              </div>
            </button>
          )}

          {/* In-App Notifications Center */}
          <NotificationCenter onOpenClaim={onOpenClaim} />

          {/* Moderation Queue */}
          <Link
            href="/moderation"
            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#71819A] hover:text-[#172B4D] px-3 py-2 rounded-xl bg-[#F5F9FF] border border-[#809DC4]/30 hover:bg-white hover:border-[#248BFF]/40 transition shadow-sm"
            title="Moderator Review Queue"
          >
            <ShieldIcon size={14} className="text-[#8B78F6]" />
            <span className="hidden sm:inline">Mod Queue</span>
          </Link>

          {/* Create Drop Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] hover:from-[#1A7CEB] hover:to-[#17B7E2] text-white shadow-[0_6px_20px_rgba(36,139,255,0.3)] active:scale-95 transition-all"
          >
            <PlusIcon size={16} />
            <span>Create Drop</span>
          </button>
        </div>
      </div>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </header>
  );
}

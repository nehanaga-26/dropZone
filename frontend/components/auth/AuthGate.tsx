'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { AuthForm } from './AuthForm';

/**
 * Site-wide gate: without a Supabase session the whole website is the
 * sign-in screen. Only signed-in users reach any page.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEF4FF] flex items-center justify-center">
        <div className="rounded-3xl bg-white/70 border border-[#809DC4]/20 p-6 h-28 w-72 animate-pulse" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#EEF4FF] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-5">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-white border border-[#809DC4]/30 flex items-center justify-center font-extrabold text-[#248BFF] text-lg">
              DZ
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-wider text-[#172B4D]">DROPZONE</h1>
            <p className="text-xs text-[#71819A]">Your Place. Your Community. Your Moment.</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(36,139,255,0.10)] border border-[#809DC4]/25">
            <AuthForm />
          </div>
          <p className="mt-4 text-center text-[11px] font-mono text-[#71819A]">
            Or <Link href="/signin" className="text-[#248BFF] font-bold">open the sign-in page</Link>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

'use client';

import React from 'react';
import { AuthForm } from './AuthForm';

/** Sign up / sign in / email-verification modal (Supabase Auth). */
export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="fixed inset-0 bg-[#172B4D]/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <AuthForm onDone={onClose} />
        <button type="button" onClick={onClose} className="mt-3 w-full text-xs text-[#71819A] hover:text-[#172B4D]">
          Close
        </button>
      </div>
    </div>
  );
}

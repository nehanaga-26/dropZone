'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Shared sign in / sign up / verify form (modal + full page). */
export function AuthForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const { signUp, signIn, resendConfirmation } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [done, setDone] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDone('');
    if (!validEmail(email)) return setError('Enter a valid email address.');
    if (mode === 'up' && password.length < 8) return setError('Password must be at least 8 characters.');
    if (!password) return setError('Enter your password.');
    setBusy(true);
    try {
      if (mode === 'up') {
        const r = await signUp(email.trim(), password);
        if (r.needsConfirm) setNeedsConfirm(true);
        else {
          setDone('Account created — signed in!');
          setTimeout(() => (onDone ? onDone() : router.push('/')), 900);
        }
      } else {
        await signIn(email.trim(), password);
        setDone('Signed in!');
        setTimeout(() => (onDone ? onDone() : router.push('/')), 900);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F0F4FA] text-xs font-bold">
        <button type="button" onClick={() => { setMode('in'); setError(''); setNeedsConfirm(false); }}
          className={`py-2 rounded-lg ${mode === 'in' ? 'bg-white text-[#248BFF] shadow' : 'text-[#71819A]'}`}>
          Sign In
        </button>
        <button type="button" onClick={() => { setMode('up'); setError(''); setNeedsConfirm(false); }}
          className={`py-2 rounded-lg ${mode === 'up' ? 'bg-white text-[#248BFF] shadow' : 'text-[#71819A]'}`}>
          Sign Up
        </button>
      </div>

      {needsConfirm ? (
        <div className="text-center py-3">
          <p className="text-sm font-bold text-[#172B4D]">Check your inbox ✉️</p>
          <p className="mt-1 text-xs text-[#3D4F6B] leading-relaxed">
            Confirmation link sent to <b>{email}</b>. Click it to verify, then sign in here.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await resendConfirmation(email.trim());
                setDone('Confirmation resent.');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Resend failed.');
              }
            }}
            className="mt-3 text-xs font-bold px-4 py-2 rounded-xl border border-[#809DC4]/30"
          >
            Resend confirmation email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-[#172B4D]" htmlFor="authf-email">Email</label>
            <input
              id="authf-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              className="mt-1 w-full text-sm px-3.5 py-2.5 rounded-xl border border-[#809DC4]/30 outline-none focus:border-[#248BFF]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#172B4D]" htmlFor="authf-pass">
              Password{mode === 'up' ? ' (min 8 characters)' : ''}
            </label>
            <div className="mt-1 relative">
              <input
                id="authf-pass" type={showPw ? 'text' : 'password'}
                autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full text-sm px-3.5 py-2.5 pr-16 rounded-xl border border-[#809DC4]/30 outline-none focus:border-[#248BFF]"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#71819A]">
                {showPw ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>
          {error && <p role="alert" className="text-xs text-[#D83852] bg-[#FEEFF1] border border-[#EF5B72]/30 rounded-xl px-3 py-2">{error}</p>}
          {done && <p role="status" className="text-xs text-[#139B79] bg-[#E8FAF4] border border-[#17B890]/30 rounded-xl px-3 py-2">{done}</p>}
          <button type="submit" disabled={busy}
            className="text-sm font-bold px-4 py-3 rounded-2xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white disabled:opacity-50">
            {busy ? 'Please wait…' : mode === 'up' ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
      )}
    </div>
  );
}

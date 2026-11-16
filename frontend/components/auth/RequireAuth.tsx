'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dropZoneService } from '../../lib/services/postService';

/** Route guard: a non-guest persona. Moderator pages add a persona check. */
export function RequireAuth({ children, moderatorOnly = false }: { children: React.ReactNode; moderatorOnly?: boolean }) {
  const router = useRouter();
  const [ok, setOk] = React.useState<boolean | null>(null);

  useEffect(() => {
    const persona = dropZoneService.getCurrentUser();
    const authed = persona && persona.id !== 'usr-guest-visitor';
    const modOk = !moderatorOnly || persona.isModerator;
    if (!authed || !modOk) {
      router.replace(moderatorOnly ? '/' : '/signin');
      setOk(false);
      return;
    }
    setOk(true);
  }, [moderatorOnly, router]);

  if (ok === null) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="rounded-2xl bg-white border border-slate-200 p-6 h-24 w-72 animate-pulse" aria-label="Loading" />
      </div>
    );
  }
  if (!ok) return null;
  return <>{children}</>;
}

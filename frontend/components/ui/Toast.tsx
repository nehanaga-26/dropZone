'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type Kind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}
const ToastContext = createContext<{ toast: (text: string, kind?: Kind) => void } | null>(null);

const DOTS: Record<Kind, string> = {
  success: 'bg-emerald-400',
  error: 'bg-rose-400',
  info: 'bg-cyan-400',
};
let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((text: string, kind: Kind = 'info') => {
    const id = nextId++;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center w-[min(92vw,420px)]" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="w-full flex items-center gap-2.5 rounded-2xl bg-indigo-950/95 text-white text-xs font-medium px-4 py-3 shadow-xl">
            <span className={`w-2 h-2 rounded-full shrink-0 ${DOTS[t.kind]}`} />
            <span className="flex-1">{t.text}</span>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

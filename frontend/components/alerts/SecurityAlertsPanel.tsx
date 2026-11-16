'use client';

import React, { useState } from 'react';
import type { SecurityAlert, AlertSeverity } from '../../lib/types';

interface Props {
  zoneName: string;
  alerts: SecurityAlert[];
  visitorMode: boolean;
  onDeclareVisit: () => void;
  onCreate: (title: string, body: string, severity: AlertSeverity) => Promise<void>;
  onRemove: (id: string) => void;
  onRefresh: () => void;
}

const CARD: Record<AlertSeverity, string> = {
  critical: 'bg-rose-50/60 border-rose-200',
  warning: 'bg-amber-50/60 border-amber-200',
  info: 'bg-white border-slate-200',
};
const TAG: Record<AlertSeverity, string> = {
  critical: 'bg-rose-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-indigo-600 text-white',
};

export function SecurityAlertsPanel({ zoneName, alerts, visitorMode, onDeclareVisit, onCreate, onRemove, onRefresh }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<AlertSeverity>('warning');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3 || body.trim().length < 5) {
      setError('Give a short title (3+) and details (5+).');
      return;
    }
    setPosting(true);
    setError('');
    try {
      await onCreate(title.trim(), body.trim(), severity);
      setTitle('');
      setBody('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post alert.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-[#809DC4]/25 p-5 shadow-[0_10px_30px_rgba(36,139,255,0.06)]">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-[#172B4D]">
          🚨 Security alerts {zoneName ? `— ${zoneName}` : ''} ({alerts.length})
        </h3>
        <button onClick={onRefresh} className="text-[11px] font-mono uppercase px-3 py-1.5 rounded-lg bg-[#F5F9FF] border border-[#809DC4]/25 text-[#248BFF]">
          Refresh
        </button>
      </div>
      <p className="text-[11px] text-[#71819A] font-mono mt-1">Residents see these inside the zone. Visitors see them <b>before</b> entering.</p>

      <button
        onClick={onDeclareVisit}
        className={`mt-3 text-[11px] font-bold px-3 py-2 rounded-xl border transition ${visitorMode ? 'bg-[#248BFF] text-white border-[#248BFF]' : 'bg-white text-[#248BFF] border-[#248BFF]/40'}`}
      >
        {visitorMode ? '✓ Visiting — alerts shown first' : "I'm visiting — show me alerts first"}
      </button>

      <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Alert e.g. Theft near gate 2 last night" aria-label="Alert title"
          className="text-xs px-3 py-2.5 rounded-xl bg-white border border-[#809DC4]/30 outline-none focus:border-[#248BFF]" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details, time, place..." rows={2} aria-label="Alert details"
          className="text-xs px-3 py-2.5 rounded-xl bg-white border border-[#809DC4]/30 outline-none focus:border-[#248BFF]" />
        <div className="flex gap-2">
          <select value={severity} onChange={(e) => setSeverity(e.target.value as AlertSeverity)} aria-label="Severity"
            className="text-xs px-3 py-2 rounded-xl bg-white border border-[#809DC4]/30">
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="critical">critical</option>
          </select>
          <button type="submit" disabled={posting} className="flex-1 text-[11px] font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5A5A] to-[#F5A524] text-white disabled:opacity-50">
            {posting ? 'Posting...' : 'Post alert'}
          </button>
        </div>
        {error && <p className="text-[11px] text-[#FF5A5A] font-mono">{error}</p>}
      </form>

      <div className="mt-3 flex flex-col gap-2">
        {alerts.map((a) => (
          <div key={a.id} className={`rounded-2xl border p-3 ${CARD[a.severity]}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${TAG[a.severity]}`}>{a.severity}</span>
              <span className="text-[10px] text-[#71819A] font-mono">{a.countdown || ''}</span>
              <button onClick={() => onRemove(a.id)} className="ml-auto text-[10px] font-mono uppercase text-[#71819A] hover:text-[#FF5A5A]">
                Remove (mod)
              </button>
            </div>
            <p className="text-xs font-bold text-[#172B4D] mt-1">{a.title}</p>
            <p className="text-[11px] text-[#3D4F6B] leading-relaxed">{a.body}</p>
          </div>
        ))}
        {alerts.length === 0 && <p className="text-[11px] text-[#71819A] font-mono">No active alerts. Expired ones hide automatically.</p>}
      </div>
    </div>
  );
}

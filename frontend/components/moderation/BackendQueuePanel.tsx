'use client';

import React, { useEffect, useState } from 'react';
import * as dataApi from '../../lib/services/data';

interface Row {
  id: string;
  reporter_id: string;
  post_id: string;
  reason: string;
  status: string;
  created_at: string;
}

/** Live backend report queue (server-enforced review). Mock queue below stays untouched. */
export function BackendQueuePanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      setRows((await dataApi.modQueue()).reports);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const review = async (id: string, action: 'retain' | 'remove') => {
    setBusy(id);
    try {
      await dataApi.modReview(id, action);
      await load();
    } catch {
      alert('Review needs a moderator account (server checks x-role header).');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-3xl bg-white/85 backdrop-blur-xl border border-emerald-300 p-5" aria-label="Live backend queue">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xs uppercase font-mono tracking-widest font-bold text-emerald-800">
          ● Live backend queue ({rows.length} pending)
        </h2>
        <button onClick={load} className="text-[11px] font-mono uppercase px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
          Refresh
        </button>
      </div>
      <p className="mt-1 text-[11px] font-mono text-slate-500">
        Real reports from the Express API. Retain → dismissed · Remove → actioned + post hidden. Requires moderator (server-verified).
      </p>
      <div className="mt-3">
        {loading ? (
          <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
        ) : failed ? (
          <p className="text-[11px] font-mono text-slate-500">Backend unreachable — showing mock queue below.</p>
        ) : rows.length === 0 ? (
          <p className="text-[11px] font-mono text-slate-500">Queue empty. Report a post from any feed to test.</p>
        ) : (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left font-mono uppercase text-[10px] text-slate-400">
                  <th className="py-2 pr-3">Reason</th>
                  <th className="py-2 pr-3">Post</th>
                  <th className="py-2 pr-3">Reported</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-semibold">{r.reason}</td>
                    <td className="py-2 pr-3 font-mono text-slate-500">{r.post_id.slice(0, 8)}…</td>
                    <td className="py-2 pr-3 font-mono text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 flex gap-2">
                      <button onClick={() => review(r.id, 'retain')} disabled={busy === r.id}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 font-bold disabled:opacity-50">Retain</button>
                      <button onClick={() => review(r.id, 'remove')} disabled={busy === r.id}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold disabled:opacity-50">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !failed && rows.length > 0 && (
          <div className="md:hidden flex flex-col gap-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs font-bold">{r.reason}</p>
                <p className="text-[10px] font-mono text-slate-500">post {r.post_id.slice(0, 8)}… · {new Date(r.created_at).toLocaleString()}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => review(r.id, 'retain')} disabled={busy === r.id} className="flex-1 px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold">Retain</button>
                  <button onClick={() => review(r.id, 'remove')} disabled={busy === r.id} className="flex-1 px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import * as dataApi from './services/data';

interface ZoneState {
  activeZoneId: string | null;
  membership: dataApi.Membership | null;
  gateMsg: string;
  selectZone: (zoneId: string, zoneName: string) => Promise<boolean>;
  leaveZone: () => void;
  setActiveZoneId: (id: string | null) => void;
  setMembership: (m: dataApi.Membership | null) => void;
  setGateMsg: (s: string) => void;
}

const ZoneContext = createContext<ZoneState | null>(null);
const KEY = 'dz_zone';

export function ZoneProvider({ children }: { children: React.ReactNode }) {
  const [activeZoneId, setActiveZoneIdState] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : localStorage.getItem(KEY)
  );
  const [membership, setMembership] = useState<dataApi.Membership | null>(null);
  const [gateMsg, setGateMsg] = useState('');

  const setActiveZoneId = useCallback((id: string | null) => {
    setActiveZoneIdState(id);
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const selectZone = useCallback(
    async (zoneId: string, zoneName: string) => {
      setActiveZoneId(zoneId);
      try {
        const m = await dataApi.checkZone(zoneId, zoneName);
        setMembership(m);
        setGateMsg(
          m.inZone
            ? `Inside ${m.zoneName} (${m.mode})${m.activeAlerts ? ` · ${m.activeAlerts} alert(s)` : ''}.`
            : 'Outside this zone — feed limited, alerts below.'
        );
        return m.inZone;
      } catch {
        setMembership(null);
        setGateMsg('');
        return true;
      }
    },
    [setActiveZoneId]
  );

  const leaveZone = useCallback(() => {
    setActiveZoneId(null);
    setMembership(null);
    setGateMsg('');
  }, [setActiveZoneId]);

  return (
    <ZoneContext.Provider value={{ activeZoneId, membership, gateMsg, selectZone, leaveZone, setActiveZoneId, setMembership, setGateMsg }}>
      {children}
    </ZoneContext.Provider>
  );
}

export function useZone(): ZoneState {
  const ctx = useContext(ZoneContext);
  if (!ctx) throw new Error('useZone must be used inside ZoneProvider');
  return ctx;
}

'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Zone } from '../../lib/types';

export interface MapPoint {
  lat: number;
  lng: number;
  /** GPS accuracy in meters — drawn as a halo. Never shown as text. */
  accuracy?: number;
}

interface Props {
  zones: Zone[];
  /** Backend-confirmed radii by zone id. Falls back to zone.radiusMeters. */
  radii: Record<string, number>;
  userLoc: MapPoint | null;
  /** zoneId → server verdict for userLoc */
  verdicts: Record<string, { inside: boolean; distanceM: number }>;
  activeZoneId: string | null;
  recenterSignal?: number;
  onPick: (p: MapPoint) => void;
  onSelectZone: (id: string) => void;
}

/** Leaflet map — rendered client-side only (dynamic import, ssr:false). */
export default function ZoneMap({ zones, radii, userLoc, verdicts, activeZoneId, recenterSignal, onPick, onSelectZone }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const selectRef = useRef(onSelectZone);
  selectRef.current = onSelectZone;

  useEffect(() => {
    if (mapRef.current || !divRef.current) return;
    const map = L.map(divRef.current, { scrollWheelZoom: true }).setView([17.6868, 83.2185], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.control.scale({ imperial: false }).addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => pickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!layerRef.current) layerRef.current = L.layerGroup().addTo(map);
    const g = layerRef.current;
    g.clearLayers();

    zones.forEach((z) => {
      const radius = radii[z.id] ?? z.radiusMeters;
      const v = userLoc ? verdicts[z.id] : undefined;
      const active = z.id === activeZoneId;
      const circle = L.circle([z.centerLat, z.centerLng], {
        radius,
        color: active ? '#312e81' : '#0d9488',
        weight: active ? 3 : 2,
        fillOpacity: 0.1,
      }).addTo(g);
      circle.bindPopup(
        `<b>${z.name}</b><br>actual radius: ${radius} m (backend)<br>` +
          (z.isTestZone ? 'DEMO MODE — simulated<br>' : '') +
          (v ? (v.inside ? `✅ inside · ${v.distanceM} m from centre` : `❌ outside · ${v.distanceM} m from centre`) : 'tap map or locate yourself')
      );
      circle.on('click', () => selectRef.current(z.id));
      L.circleMarker([z.centerLat, z.centerLng], {
        radius: 5,
        color: active ? '#312e81' : '#0d9488',
        fillOpacity: 1,
      }).addTo(g);
    });

    if (userLoc) {
      const anyInside = Object.values(verdicts).some((v) => v.inside);
      if (userLoc.accuracy && userLoc.accuracy > 0) {
        L.circle([userLoc.lat, userLoc.lng], {
          radius: Math.min(userLoc.accuracy, 500),
          color: anyInside ? '#059669' : '#2563eb',
          weight: 1,
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(g);
      }
      const icon = L.divIcon({
        className: 'dz-you-wrap',
        html: `<div class="dz-you-dot dz-you-ping ${anyInside ? 'dz-you-inside' : ''}"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([userLoc.lat, userLoc.lng], { icon, zIndexOffset: 1000 })
        .addTo(g)
        .bindTooltip('📍 YOU ARE HERE', { permanent: true, direction: 'top', offset: [0, -12] })
        .bindPopup(anyInside ? '<b>YOU</b> — inside a zone ✅' : '<b>YOU</b> — outside all zones');
      map.setView([userLoc.lat, userLoc.lng], Math.max(map.getZoom(), 15));
    } else if (zones.length > 0) {
      const bounds = L.latLngBounds(zones.map((z) => [z.centerLat, z.centerLng] as [number, number]));
      map.fitBounds(bounds.pad(0.4));
    }
  }, [zones, radii, userLoc, verdicts, activeZoneId]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && userLoc && recenterSignal) {
      map.setView([userLoc.lat, userLoc.lng], Math.max(map.getZoom(), 15));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal]);

  return (
    <div>
      <div ref={divRef} className="h-[300px] rounded-2xl border border-[#809DC4]/25 z-0" />
      <div className="mt-2 flex items-center gap-3 flex-wrap text-[11px] text-[#71819A]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-[#2563eb] border-2 border-white shadow" />
          Pulsing dot = YOU (only you see it)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-teal-700" />
          Circles = zone radii in meters
        </span>
      </div>
    </div>
  );
}

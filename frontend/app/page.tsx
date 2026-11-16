'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { RightSidebar } from '../components/layout/RightSidebar';
import { MobileNav } from '../components/layout/MobileNav';
import { ZoneStatusBanner } from '../components/zones/ZoneStatusBanner';
import { FeedTabs } from '../components/feed/FeedTabs';
import { PostCard } from '../components/feed/PostCard';
import { EmptyFeed } from '../components/feed/EmptyFeed';
import { SearchBar } from '../components/feed/SearchBar';
import { CreatePostModal } from '../components/posts/CreatePostModal';
import { EditPostModal } from '../components/posts/EditPostModal';
import { ReportModal } from '../components/posts/ReportModal';
import { CreateZoneModal } from '../components/zones/CreateZoneModal';
import { ZoneManagementModal } from '../components/zones/ZoneManagementModal';
import { ClaimModal } from '../components/claims/ClaimModal';
import { PrivateClaimChatModal } from '../components/claims/PrivateClaimChatModal';
import { DEFAULT_ZONE_ID } from '../lib/mock/zones';
import { dropZoneService } from '../lib/services/postService';
import * as dataApi from '../lib/services/data';
import { useZone } from '../lib/zone-context';
import { SecurityAlertsPanel } from '../components/alerts/SecurityAlertsPanel';
import type { MapPoint } from '../components/map/ZoneMap';

const ZoneMap = dynamic(() => import('../components/map/ZoneMap'), { ssr: false });
import {
  Post,
  PostCategory,
  CreatePostInput,
  ReportReason,
  Zone,
  SearchFilters,
  LostFoundClaim,
  SecurityAlert,
} from '../lib/types';

export default function HomePage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const { activeZoneId, setActiveZoneId, membership, setMembership, gateMsg, setGateMsg } = useZone();
  const [activeCategory, setActiveCategory] = useState<PostCategory>('feed');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [allZonePosts, setAllZonePosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [managingZone, setManagingZone] = useState<Zone | null>(null);
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [claimingPost, setClaimingPost] = useState<Post | null>(null);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);

  // Backend-powered state (zones/posts/reports/alerts via Express API first,
  // mock fallback keeps the app working offline).
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [visitorMode, setVisitorMode] = useState(false);

  // M1 map + geofencing: user point, backend radii, server verdicts per zone.
  const [userLoc, setUserLoc] = useState<MapPoint | null>(null);
  const [radii, setRadii] = useState<Record<string, number>>({});
  const [verdicts, setVerdicts] = useState<Record<string, { inside: boolean; distanceM: number }>>({});
  const [recenter, setRecenter] = useState(0);
  const [gpsBusy, setGpsBusy] = useState(false);

  // Load zones dynamically (backend-first)
  const loadZones = useCallback(async () => {
    const list = await dataApi.listZones();
    setZones([...list]);
    if (!list.some((z) => z.id === activeZoneId)) {
      setActiveZoneId(list[0]?.id || null);
    }
    // Authoritative radii from the backend check API (for true-size map circles).
    const r: Record<string, number> = {};
    await Promise.all(
      list.map(async (z) => {
        try {
          const c = await dataApi.checkZone(z.id, z.name);
          if (c.radiusM) r[z.id] = c.radiusM;
        } catch {
          /* keep mapper fallback radius */
        }
      })
    );
    setRadii(r);
  }, [activeZoneId, setActiveZoneId]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const activeZone = useMemo(
    () => zones.find((z) => z.id === activeZoneId) || null,
    [zones, activeZoneId]
  );

  // Load posts with search and category filtering
  const loadPosts = useCallback(async () => {
    if (!activeZoneId) {
      setPosts([]);
      setAllZonePosts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Known location? Server also applies each post's own radius.
      const loc = userLoc ? { lat: userLoc.lat, lng: userLoc.lng } : undefined;
      // Fetch all posts in zone for count computation (backend-first)
      const allInZone = await dataApi.listPosts(activeZoneId, undefined, undefined, loc);
      setAllZonePosts(allInZone);

      // Fetch filtered posts for current category and search query
      const tabPosts = await dataApi.listPosts(
        activeZoneId,
        activeCategory,
        searchFilters,
        loc
      );
      setPosts(tabPosts);
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeZoneId, activeCategory, searchFilters, userLoc]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Tab count badges
  const counts = useMemo(() => {
    return {
      feed: allZonePosts.filter((p) => p.category === 'feed').length,
      lost_found: allZonePosts.filter((p) => p.category === 'lost_found').length,
      team_match: allZonePosts.filter((p) => p.category === 'team_match').length,
    };
  }, [allZonePosts]);

  // Handlers
  const handleSelectZone = async (zoneId: string) => {
    setActiveZoneId(zoneId);
    setVisitorMode(false);
    try {
      const zone = zones.find((z) => z.id === zoneId);
      const m = await dataApi.checkZone(zoneId, zone?.name || '');
      setMembership(m);
      setGateMsg(
        m.inZone
          ? `Inside ${m.zoneName} (${m.mode})${m.activeAlerts ? ` · ${m.activeAlerts} alert(s)` : ''}.`
          : 'Outside this zone — feed limited, alerts below.'
      );
    } catch {
      setMembership(null);
      setGateMsg('');
    }
    try {
      setAlerts(await dataApi.listAlerts(zoneId));
    } catch {
      setAlerts([]);
    }
  };

  const handleLeaveZone = async () => {
    const zid = activeZoneId;
    const hadPosts = posts.length;
    const hadAlerts = alerts.length;
    // 1. Server: delete YOUR visit declarations for this zone.
    if (zid) await dataApi.leaveZoneCleanup(zid).catch(() => 0);
    // 2. Device: drop every copy — feed, alerts, verdicts, point, membership.
    setActiveZoneId(null);
    setMembership(null);
    setAlerts([]);
    setPosts([]);
    setAllZonePosts([]);
    setVisitorMode(false);
    setUserLoc(null);
    setVerdicts({});
    setGateMsg(
      `Left the zone — deleted your data (visits on server; ${hadPosts} posts + ${hadAlerts} alerts cleared from this device). Feed locked.`
    );
  };

  // Server-verified verdicts for a point across all zones (feed gating).
  const verifyPoint = useCallback(
    async (point: MapPoint) => {
      const out: Record<string, { inside: boolean; distanceM: number }> = {};
      await Promise.all(
        zones.map(async (z) => {
          try {
            const c = await dataApi.checkZone(z.id, z.name, { lat: point.lat, lng: point.lng, accuracy: point.accuracy ?? 10 });
            out[z.id] = { inside: c.inZone, distanceM: c.distanceM ?? 0 };
          } catch {
            out[z.id] = { inside: false, distanceM: 0 };
          }
        })
      );
      setVerdicts(out);
      return out;
    },
    [zones]
  );

  // "Locate Me": real GPS → server verdict decides feed access.
  const handleLocate = () => {
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const pt: MapPoint = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        if (p.coords.accuracy > 100) {
          setGateMsg('Low GPS accuracy — retry or use a test zone.');
        }
        setUserLoc(pt);
        setGpsBusy(false);
        const out = await verifyPoint(pt);
        if (activeZoneId) {
          const v = out[activeZoneId];
          if (v && !v.inside) {
            setMembership({ inZone: false, mode: 'gps', distanceM: v.distanceM, zoneName: zones.find((z) => z.id === activeZoneId)?.name });
            setGateMsg(`Outside this zone (${v.distanceM}m away) — feed locked. Use a test zone for demo.`);
          } else if (v) {
            const zone = zones.find((z) => z.id === activeZoneId);
            const m = await dataApi.checkZone(activeZoneId, zone?.name || '', { lat: pt.lat, lng: pt.lng, accuracy: pt.accuracy }).catch(() => null);
            if (m) {
              setMembership(m);
              setGateMsg(`Inside ${m.zoneName} (gps, ${m.distanceM}m) — feed unlocked.`);
            }
          }
        }
      },
      () => {
        setGpsBusy(false);
        setGateMsg('Location unavailable or denied — allow permission, retry, or use a test zone.');
      },
      { timeout: 9000 }
    );
  };

  // Tap on map = simulated test point (always labelled DEMO MODE).
  const handleMapPick = async (pt: MapPoint) => {
    setUserLoc(pt);
    await verifyPoint(pt);
  };

  const handleRejoinDefault = async () => {
    const target = zones.find((z) => z.id === DEFAULT_ZONE_ID) || zones[0];
    if (!target) return;
    await handleSelectZone(target.id);
  };

  const handleZoneCreated = (newZone: Zone) => {
    loadZones();
    setActiveZoneId(newZone.id);
  };

  const handleZoneUpdated = (updatedZone: Zone) => {
    loadZones();
    if (managingZone?.id === updatedZone.id) {
      setManagingZone(updatedZone);
    }
  };

  const handleCreatePost = async (input: CreatePostInput) => {
    const currentUser = dropZoneService.getCurrentUser();
    const post = await dataApi.createPost(
      input.zoneId,
      input.category,
      input.title,
      input.content,
      input.ttlHours,
      currentUser,
      input.metadata?.itemType,
      input.radiusM ?? null
    );
    loadPosts();
    return post;
  };

  const handleReportPost = async (
    postId: string,
    title: string,
    reason: ReportReason,
    notes?: string
  ) => {
    const currentUser = dropZoneService.getCurrentUser();
    return await dataApi.reportPost(postId, title, reason, notes, currentUser);
  };

  const handleClaimCreated = (claim: LostFoundClaim) => {
    setActiveClaimId(claim.id);
    loadPosts();
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
  };

  const handleDeletePost = async (post: Post) => {
    if (confirm(`Are you sure you want to delete "${post.title}"? This will permanently remove it from the spatial zone feed.`)) {
      try {
        await dropZoneService.deletePost(post.id);
        await loadPosts();
      } catch (err: any) {
        alert(err.message || 'Failed to delete drop.');
      }
    }
  };

  const handleBlockUser = async (post: Post) => {
    if (!confirm(`Hide all posts from ${post.authorName}?`)) return;
    try {
      await dataApi.blockUser(post.authorId);
      setGateMsg(`Blocked ${post.authorName}. Their posts are hidden from you.`);
      await loadPosts();
    } catch {
      setGateMsg('Block failed — backend blocks table may be missing.');
    }
  };

  const loadAlerts = useCallback(async () => {
    if (!activeZoneId) {
      setAlerts([]);
      return;
    }
    try {
      setAlerts(await dataApi.listAlerts(activeZoneId));
    } catch {
      setAlerts([]);
    }
  }, [activeZoneId]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleCreateAlert = async (title: string, body: string, severity: SecurityAlert['severity']) => {
    if (!activeZoneId) return;
    await dataApi.createAlert(activeZoneId, title, body, severity, 24);
    await loadAlerts();
  };

  const handleDeclareVisit = async () => {
    if (!activeZoneId) return;
    const { message, alerts: visitAlerts } = await dataApi.declareVisit(activeZoneId);
    setAlerts(visitAlerts);
    setVisitorMode(true);
    setGateMsg(message);
  };

  return (
    <div className="min-h-screen bg-[#EEF4FF] text-[#172B4D] flex flex-col pb-24 lg:pb-10 selection:bg-[#248BFF]/20 selection:text-[#248BFF]">
      {/* Top Floating Navigation Bar */}
      <Header
        currentZone={activeZone}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenClaim={(claimId) => setActiveClaimId(claimId)}
      />

      {/* Main 3-Column Glassmorphism Grid Layout */}
      <main className="max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-2 flex-1">
        <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-7.5rem)]">
          {/* Left Column: Your Zones */}
          <Sidebar
            zones={zones}
            activeZoneId={activeZoneId}
            onSelectZone={handleSelectZone}
            onLeaveZone={handleLeaveZone}
            onOpenCreateZone={() => setIsCreateZoneOpen(true)}
            onOpenManageZone={(zone) => setManagingZone(zone)}
          />

          {/* Center Column: Main Social Feed Stream */}
          <section className="flex-1 flex flex-col gap-5 min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pb-6 lg:pr-1">
            {/* Active Zone Hero Banner */}
            <ZoneStatusBanner
              zone={activeZone}
              onRejoinZone={handleRejoinDefault}
              onOpenCreateModal={activeZone ? () => setIsCreateModalOpen(true) : undefined}
            />
            {(membership || gateMsg) && (
              <div className="rounded-2xl bg-white/85 backdrop-blur-xl border border-[#809DC4]/25 px-4 py-2.5 text-[11px] font-mono text-[#3D4F6B]">
                {membership
                  ? `${membership.inZone ? '✅ Inside' : '❌ Outside'} ${membership.zoneName || ''} (${membership.mode})${
                      membership.distanceM != null ? ` · ${membership.distanceM}m` : ''
                    }${membership.activeAlerts ? ` · 🚨 ${membership.activeAlerts} alert(s)` : ''}`
                  : gateMsg}
              </div>
            )}

            {/* M1 geofence map: real circles, locate-me, tap-to-test */}
            <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-[#809DC4]/25 p-4 shadow-[0_10px_30px_rgba(36,139,255,0.06)]">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                <h2 className="text-xs uppercase tracking-widest font-mono font-bold text-[#172B4D]">
                  🗺️ Zone Map — feed follows your location
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleLocate}
                    disabled={gpsBusy}
                    className="text-[11px] font-bold px-3.5 py-2 rounded-xl bg-[#172B4D] text-white disabled:opacity-50"
                  >
                    {gpsBusy ? 'Locating…' : '📍 Locate Me'}
                  </button>
                  {userLoc && (
                    <button
                      onClick={() => setRecenter((c) => c + 1)}
                      className="text-[11px] font-bold px-3.5 py-2 rounded-xl bg-white border border-[#809DC4]/25"
                    >
                      Center on me
                    </button>
                  )}
                </div>
              </div>
              <ZoneMap
                zones={zones}
                radii={radii}
                userLoc={userLoc}
                verdicts={verdicts}
                activeZoneId={activeZoneId}
                recenterSignal={recenter}
                onPick={handleMapPick}
                onSelectZone={handleSelectZone}
              />
            </div>

            {/* Zone feed + alerts live in the right column, next to zone insights */}

            {/* Locked / no-zone notice stays in the center */}
            {(!activeZone || membership?.inZone === false) && (
              <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-[#809DC4]/25 p-10 text-center flex flex-col items-center justify-center gap-3 shadow-[0_10px_30px_rgba(36,139,255,0.06)]">
                <div className="w-14 h-14 rounded-2xl bg-[#E8F4FF] border border-[#248BFF]/25 flex items-center justify-center text-xl shadow-inner text-[#248BFF]">
                  📍
                </div>
                <h3 className="text-base font-bold text-[#172B4D]">
                  {membership && !membership.inZone
                    ? `Outside ${membership.zoneName || 'this zone'} — feed locked`
                    : 'Out-of-Bounds: Geofence Disconnected'}
                </h3>
                <p className="text-xs text-[#71819A] max-w-md leading-relaxed font-mono">
                  {membership && !membership.inZone
                    ? `Server says you are ${membership.distanceM ?? '?'}m from the centre — outside the zone. Use the map above to check, retry GPS, or enter a simulated test zone for demo.`
                    : 'DropZone protects student privacy by restricting broadcasts to verified campus perimeters. Re-enter a geofenced zone to participate.'}
                </p>
                <div className="flex gap-2 flex-wrap justify-center">
                  <button
                    onClick={handleLocate}
                    className="mt-3 text-xs font-mono uppercase font-bold px-5 py-2.5 rounded-xl bg-white border border-[#809DC4]/25 hover:border-[#248BFF] transition"
                  >
                    Retry GPS
                  </button>
                  <button
                    onClick={handleRejoinDefault}
                    className="mt-3 text-xs font-mono uppercase font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white shadow-[0_4px_16px_rgba(36,139,255,0.3)] hover:from-[#1A7CEB] hover:to-[#17B7E2] transition"
                  >
                    Enter Hackathon Arena
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Right Column: zone insights + alerts + zone feed */}
          <div className="w-full lg:w-[400px] xl:w-[430px] shrink-0 flex flex-col gap-5 lg:min-h-0 lg:overflow-y-auto lg:pb-6">
            <RightSidebar
              currentZone={activeZone}
              zonePosts={allZonePosts}
            />

            {activeZone ? (
              <SecurityAlertsPanel
                zoneName={activeZone.name}
                alerts={alerts}
                visitorMode={visitorMode}
                onDeclareVisit={handleDeclareVisit}
                onCreate={handleCreateAlert}
                onRemove={async (id) => {
                  if (!activeZoneId) return;
                  await dataApi.removeAlert(activeZoneId, id);
                  await loadAlerts();
                }}
                onRefresh={loadAlerts}
              />
            ) : null}

            {activeZone && membership?.inZone !== false ? (
              <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-[#809DC4]/25 p-4 shadow-[0_10px_30px_rgba(36,139,255,0.06)]">
                <h2 className="text-xs uppercase tracking-widest font-mono font-bold text-[#172B4D] mb-3">
                  📡 Zone Feed — {activeZone.name}
                </h2>
                {/* Search & Discovery Controls */}
                <SearchBar
                  filters={searchFilters}
                  onFiltersChange={setSearchFilters}
                  activeCategoryTab={activeCategory}
                />

                {/* Category Navigation Tabs */}
                <div className="mt-3">
                  <FeedTabs
                    activeTab={activeCategory}
                    onTabChange={setActiveCategory}
                    counts={counts}
                  />
                </div>

                {/* Feed Content Stream */}
                <div className="mt-3">
                  {isLoading ? (
                    <div className="space-y-4 py-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="rounded-3xl bg-white/70 border border-[#809DC4]/20 p-6 h-44 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : posts.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          zoneName={activeZone.name}
                          isZoneActive={activeZone.status === 'active'}
                          onReport={(p) => setReportingPost(p)}
                          onInitiateClaim={(p) => setClaimingPost(p)}
                          onOpenClaim={(claimId) => setActiveClaimId(claimId)}
                          onEditPost={handleEditPost}
                          onDeletePost={handleDeletePost}
                          onBlockUser={handleBlockUser}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyFeed
                      category={activeCategory}
                      zoneName={activeZone.name}
                      onOpenCreateModal={() => setIsCreateModalOpen(true)}
                    />
                  )}
                </div>
              </div>
            ) : activeZone ? (
              <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-[#809DC4]/25 p-6 text-center text-xs font-mono text-[#71819A]">
                Feed locked — you are outside this zone. Verify on the map.
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentZone={activeZone}
        initialCategory={activeCategory}
        createPostFn={handleCreatePost}
        onPostCreated={loadPosts}
      />

      <EditPostModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        post={editingPost}
        onPostUpdated={() => loadPosts()}
      />

      <CreateZoneModal
        isOpen={isCreateZoneOpen}
        onClose={() => setIsCreateZoneOpen(false)}
        onZoneCreated={handleZoneCreated}
      />

      <ZoneManagementModal
        isOpen={!!managingZone}
        onClose={() => setManagingZone(null)}
        zone={managingZone}
        onZoneUpdated={handleZoneUpdated}
      />

      <ReportModal
        isOpen={!!reportingPost}
        onClose={() => setReportingPost(null)}
        post={reportingPost}
        onReportSubmitted={handleReportPost}
      />

      <ClaimModal
        isOpen={!!claimingPost}
        onClose={() => setClaimingPost(null)}
        post={claimingPost}
        onClaimCreated={handleClaimCreated}
      />

      <PrivateClaimChatModal
        isOpen={!!activeClaimId}
        onClose={() => setActiveClaimId(null)}
        claimId={activeClaimId}
        onClaimUpdated={() => loadPosts()}
      />

      {/* Mobile Floating Bottom Navigation */}
      <MobileNav
        zones={zones}
        activeZoneId={activeZoneId}
        onSelectZone={handleSelectZone}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />
    </div>
  );
}

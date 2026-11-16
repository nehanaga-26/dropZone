'use client';

import React, { useState, useEffect, useRef } from 'react';
import { InAppNotification } from '../../lib/types';
import { dropZoneService } from '../../lib/services/postService';
import { BellIcon, CheckIcon, ClockIcon, MessageSquareIcon, ShieldIcon, SparklesIcon } from '../ui/icons';

interface NotificationCenterProps {
  onOpenClaim?: (claimId: string) => void;
}

export function NotificationCenter({ onOpenClaim }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentUser = dropZoneService.getCurrentUser();

  const loadNotifications = async () => {
    try {
      const list = await dropZoneService.listNotifications();
      setNotifications([...list]);
    } catch (e) {
      console.warn('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleMarkAllRead = async () => {
    await dropZoneService.markAllNotificationsRead();
    await loadNotifications();
  };

  const handleItemClick = async (n: InAppNotification) => {
    await dropZoneService.markNotificationRead(n.id);
    await loadNotifications();
    if (n.type.includes('claim') && n.entityId && onOpenClaim) {
      onOpenClaim(n.entityId);
      setIsOpen(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquareIcon size={14} className="text-[#248BFF]" />;
      case 'claim_new':
      case 'claim_message':
      case 'claim_evidence':
        return <ShieldIcon size={14} className="text-amber-500" />;
      case 'claim_decision':
      case 'item_status':
        return <SparklesIcon size={14} className="text-emerald-500" />;
      case 'zone_expiry':
        return <ClockIcon size={14} className="text-rose-500" />;
      default:
        return <BellIcon size={14} className="text-[#248BFF]" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          loadNotifications();
        }}
        className="relative p-2.5 rounded-2xl bg-white/80 border border-[#809DC4]/25 hover:border-[#248BFF]/40 text-[#172B4D] hover:bg-white transition shadow-sm"
        title="In-App Notifications"
        aria-label="Notifications"
      >
        <BellIcon size={18} className="text-[#71819A] hover:text-[#248BFF] transition" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white text-[10px] font-mono font-bold flex items-center justify-center shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white/95 backdrop-blur-xl border border-[#809DC4]/30 shadow-[0_20px_50px_rgba(36,139,255,0.2)] z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[#809DC4]/20 flex items-center justify-between bg-white/70">
            <div>
              <h4 className="text-sm font-bold text-[#172B4D]">Notifications</h4>
              <p className="text-[10px] text-[#71819A] font-mono">{unreadCount} unread alerts</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-[#248BFF] font-semibold hover:underline flex items-center gap-1"
              >
                <CheckIcon size={12} />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#809DC4]/15">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#71819A] space-y-1">
                <BellIcon size={24} className="mx-auto text-[#809DC4]/50 mb-2" />
                <p>No notifications yet.</p>
                <p className="text-[10px]">Updates about comments, claims, and zones appear here.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`p-3.5 hover:bg-[#F0F4FA] transition cursor-pointer flex items-start gap-3 ${
                      isUnread ? 'bg-[#F0F7FF]/60' : 'bg-transparent'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white border border-[#809DC4]/20 shrink-0 shadow-2xs">
                      {getIconForType(n.type)}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className={`text-xs ${isUnread ? 'font-bold text-[#172B4D]' : 'font-normal text-[#42526E]'}`}>
                        {n.message}
                      </p>
                      <span className="text-[10px] font-mono text-[#71819A]">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-[#248BFF] mt-1 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

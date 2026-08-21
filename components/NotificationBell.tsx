'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, BellRing, Sparkles } from 'lucide-react';
import { AppNotification } from '@/types';
import { useLanguage } from '@/lib/i18n';
import { playTicketAlertSound, playNotificationChime } from '@/lib/sound';

function formatRelativeTime(dateString: string, lang: 'th' | 'en'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return lang === 'en' ? 'Just now' : 'เมื่อครู่นี้';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return lang === 'en' ? `${diffMin}m ago` : `${diffMin} นาทีที่แล้ว`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return lang === 'en' ? `${diffHour}h ago` : `${diffHour} ชั่วโมงที่แล้ว`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return lang === 'en' ? `${diffDay}d ago` : `${diffDay} วันที่แล้ว`;
  return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'th-TH');
}

export default function NotificationBell() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const getLocalReadIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem('read_notif_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };

  const saveLocalReadIds = (ids: string[]) => {
    try {
      const current = getLocalReadIds();
      ids.forEach((id) => current.add(id));
      localStorage.setItem('read_notif_ids', JSON.stringify(Array.from(current)));
    } catch {
      // Ignore localStorage errors
    }
  };

  const fetchInitialNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const rawList: AppNotification[] = data.notifications || [];
        const localRead = getLocalReadIds();

        const mergedList = rawList.map((n) => ({
          ...n,
          is_read: n.is_read || localRead.has(n.id),
        }));

        setNotifications(mergedList);
        const unreadList = mergedList.filter((n) => !n.is_read);
        setUnreadCount(unreadList.length);

        // Check for brand new notifications to trigger sound
        if (!isFirstLoadRef.current) {
          const brandNewUnread = unreadList.filter((n) => !seenNotifIdsRef.current.has(n.id));
          if (brandNewUnread.length > 0) {
            const hasTicket = brandNewUnread.some((n) => n.type === 'ticket');
            if (hasTicket) {
              playTicketAlertSound();
            } else {
              playNotificationChime();
            }

            // Desktop notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                const latest = brandNewUnread[0];
                new Notification(latest.title, {
                  body: latest.message,
                  icon: '/favicon.ico',
                });
              } catch {
                // Ignore notification error
              }
            }
          }
        }

        // Update seen IDs
        mergedList.forEach((n) => seenNotifIdsRef.current.add(n.id));
        isFirstLoadRef.current = false;
      }
    } catch (err) {
      console.error('Error loading initial notifications:', err);
    }
  };

  useEffect(() => {
    fetchInitialNotifications();

    // Fast polling every 10 seconds for real-time notifications & sound alerts
    const interval = setInterval(fetchInitialNotifications, 10000);

    // Close click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (notificationId?: string, markAll = false) => {
    try {
      const allIds = notifications.map((n) => n.id);
      if (markAll) {
        saveLocalReadIds(allIds);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      } else if (notificationId) {
        saveLocalReadIds([notificationId]);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notificationId,
          mark_all: markAll,
          notif_ids: markAll ? allIds : notificationId ? [notificationId] : undefined,
        }),
      });
    } catch (err) {
      console.error('Mark notification as read error:', err);
    }
  };

  const handleItemClick = (notif: AppNotification) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
        title={lang === 'en' ? 'Notifications' : 'การแจ้งเตือน'}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-28px)] rounded-3xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden animate-fade-in text-xs">
          {/* Header */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-orange-500" />
              <h3 className="font-bold text-slate-900 text-sm">{lang === 'en' ? 'Notifications' : 'การแจ้งเตือน'}</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                  {unreadCount} {lang === 'en' ? 'new' : 'ใหม่'}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => handleMarkAsRead(undefined, true)}
                className="text-orange-600 hover:text-orange-700 text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Mark all as read' : 'อ่านทั้งหมด'}</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <span>{lang === 'en' ? 'No notifications at this time' : 'ยังไม่มีการแจ้งเตือนในขณะนี้'}</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-4 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-50 ${
                    !n.is_read ? 'bg-orange-50/40' : ''
                  }`}
                >
                  <div className="mt-1">
                    {!n.is_read ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block shrink-0" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 text-xs">{n.title}</p>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatRelativeTime(n.created_at, lang)}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

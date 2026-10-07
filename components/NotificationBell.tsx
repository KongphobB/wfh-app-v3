'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, BellRing, Sparkles, Smartphone, Volume2 } from 'lucide-react';
import { AppNotification } from '@/types';
import { useLanguage } from '@/lib/i18n';
import { playTicketAlertSound, playNotificationChime, playSpotCheckChime } from '@/lib/sound';
import {
  showNativeNotification,
  getNotificationPermission,
  requestNotificationPermission,
  testDeviceNotification,
  NotificationPermissionState,
} from '@/lib/clientNotification';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>('default');
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Sync notification permission status
  useEffect(() => {
    setPermissionState(getNotificationPermission());
  }, [isOpen]);

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

        // Check for brand new notifications to trigger sound & native notification
        if (!isFirstLoadRef.current) {
          const brandNewUnread = unreadList.filter((n) => !seenNotifIdsRef.current.has(n.id));
          if (brandNewUnread.length > 0) {
            const hasTicket = brandNewUnread.some((n) => n.type === 'ticket');
            const latest = brandNewUnread[0];

            // Trigger sound & native push notification via clientNotification
            showNativeNotification({
              title: latest.title,
              body: latest.message,
              url: latest.link || '/dashboard',
              sound: hasTicket ? 'ticket' : 'chime',
              tag: latest.id,
            }).catch(() => {});
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

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionState(getNotificationPermission());
    if (granted) {
      toast.success(lang === 'en' ? 'Notifications enabled successfully!' : 'เปิดรับการแจ้งเตือนสำเร็จแล้ว!');
      await testDeviceNotification();
    } else {
      toast.error(
        lang === 'en'
          ? 'Notifications were denied. Please enable them in browser settings.'
          : 'การแจ้งเตือนถูกปิดกั้น กรุณาเปิดอนุญาตในการตั้งค่าเบราว์เซอร์'
      );
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    // Synchronously play chime and vibrate immediately on user tap
    playSpotCheckChime(true);
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 400]);
      } catch {}
    }
    try {
      const result = await testDeviceNotification();
      setPermissionState(getNotificationPermission());
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
    } finally {
      setIsTestingNotif(false);
    }
  };

  useEffect(() => {
    fetchInitialNotifications();

    // Visibility-aware notification polling (35s active tab, instant on focus)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchInitialNotifications();
    }, 35000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchInitialNotifications();
      }
    };
    const handleFocus = () => {
      fetchInitialNotifications();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Close click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
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
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-28px)] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-fade-in text-xs">
          {/* Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-orange-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{lang === 'en' ? 'Notifications' : 'การแจ้งเตือน'}</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-[10px] font-bold">
                  {unreadCount} {lang === 'en' ? 'new' : 'ใหม่'}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => handleMarkAsRead(undefined, true)}
                className="text-orange-600 dark:text-orange-400 hover:text-orange-700 text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Mark all as read' : 'อ่านทั้งหมด'}</span>
              </button>
            )}
          </div>

          {/* Device Notification Permission Banner */}
          {permissionState !== 'granted' && permissionState !== 'unsupported' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
                <div className="truncate">
                  <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 truncate">
                    {lang === 'en' ? 'Device Notifications' : 'การแจ้งเตือนบนอุปกรณ์'}
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 truncate">
                    {lang === 'en' ? 'Tap to enable push alerts' : 'กดเปิดเพื่อรับแจ้งเตือนสุ่มตรวจ'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleRequestPermission}
                className="h-7 px-2.5 text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer shrink-0 shadow-xs"
              >
                {lang === 'en' ? 'Enable' : 'เปิดใช้งาน'}
              </Button>
            </div>
          )}

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <span>{lang === 'en' ? 'No notifications at this time' : 'ยังไม่มีการแจ้งเตือนในขณะนี้'}</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-4 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    !n.is_read ? 'bg-orange-50/40 dark:bg-orange-950/20' : ''
                  }`}
                >
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-orange-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">{n.title}</p>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 block">
                      {formatRelativeTime(n.created_at, lang)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {permissionState === 'granted'
                  ? (lang === 'en' ? 'Push active' : 'เปิดแจ้งเตือนแล้ว')
                  : (lang === 'en' ? 'Push inactive' : 'ยังไม่เปิดแจ้งเตือน')}
              </span>
            </span>
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isTestingNotif}
              className="text-orange-600 dark:text-orange-400 hover:text-orange-700 font-bold flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50"
              title={lang === 'en' ? 'Test sound, vibration, and push banner' : 'ทดสอบเสียง สั่น และป้ายแจ้งเตือน'}
            >
              <BellRing className="w-3 h-3" />
              <span>{isTestingNotif ? (lang === 'en' ? 'Testing...' : 'กำลังทดสอบ...') : (lang === 'en' ? 'Test Alert' : 'ทดสอบแจ้งเตือน')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

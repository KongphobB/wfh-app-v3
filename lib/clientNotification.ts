'use client';

import { playSpotCheckChime, playNotificationChime, playTicketAlertSound, playSuccessChime } from '@/lib/sound';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface ShowNativeNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  sound?: 'spotcheck' | 'chime' | 'ticket' | 'success' | 'none';
  vibrate?: number[];
  requireInteraction?: boolean;
}

/**
 * Check if the browser / platform supports the Notification API
 */
export function isNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('Notification' in window || typeof (window as any).Notification !== 'undefined' || typeof Notification !== 'undefined')
  );
}

/**
 * Get current notification permission state
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Request notification permission from the user (Must be triggered by a user gesture / tap)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch (err) {
    console.warn('requestNotificationPermission error:', err);
    return false;
  }
}

/**
 * Dispatch a native system notification to mobile device or desktop
 * Prefers Service Worker showNotification (required for iOS PWA and Android Mobile)
 * Falls back to new Notification() for standard desktop browsers.
 */
export async function showNativeNotification(options: ShowNativeNotificationOptions): Promise<boolean> {
  const {
    title,
    body,
    icon = '/icons/icon-192.png',
    badge = '/icons/icon-192.png',
    url = '/dashboard',
    tag,
    sound = 'chime',
    vibrate = [200, 100, 200, 100, 200],
    requireInteraction = false,
  } = options;

  // 1. Play sound chime if requested
  if (sound === 'spotcheck') {
    playSpotCheckChime(true);
  } else if (sound === 'ticket') {
    playTicketAlertSound();
  } else if (sound === 'success') {
    playSuccessChime();
  } else if (sound === 'chime') {
    playNotificationChime();
  }

  // 2. Trigger haptic vibration on mobile devices
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(vibrate);
    } catch {
      // Ignore vibration error
    }
  }

  // 3. Check permission
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  // 4. Try Service Worker showNotification (Best for Mobile & PWA)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon,
          badge,
          tag: tag || `snu_notif_${Date.now()}`,
          vibrate,
          requireInteraction,
          data: { url },
        } as any);
        return true;
      }
    } catch (swErr) {
      console.warn('ServiceWorker showNotification failed, attempting fallback:', swErr);
    }
  }

  // 5. Fallback for standard desktop web browsers
  try {
    const notif = new Notification(title, {
      body,
      icon,
      tag: tag || `snu_notif_${Date.now()}`,
      requireInteraction,
    });

    notif.onclick = () => {
      window.focus();
      if (url && typeof window !== 'undefined') {
        window.location.href = url;
      }
    };
    return true;
  } catch (winErr) {
    console.warn('Native Notification fallback error:', winErr);
    return false;
  }
}

/**
 * Trigger a test notification with sound, vibration, and banner
 */
export async function testDeviceNotification(): Promise<{ success: boolean; message: string }> {
  if (!isNotificationSupported()) {
    return {
      success: false,
      message: 'อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับระบบ Notification',
    };
  }

  let perm = getNotificationPermission();
  if (perm !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) {
      return {
        success: false,
        message: 'คุณยังไม่ได้อนุญาตการแจ้งเตือน (กรุณากดเปิดอนุญาตในแถบตั้งค่าของเบราว์เซอร์)',
      };
    }
  }

  await showNativeNotification({
    title: '🔔 ทดสอบการแจ้งเตือน SNU WFH',
    body: 'ระบบแจ้งเตือนทำงานได้สมบูรณ์แบบ! คุณจะไม่พลาดการสุ่มตรวจและงานสำคัญ',
    url: '/dashboard',
    sound: 'spotcheck',
    tag: 'test_notification',
    requireInteraction: false,
  });

  return {
    success: true,
    message: 'ส่งการแจ้งเตือนทดสอบสำเร็จ! โปรดดูแถบแจ้งเตือนบนหน้าจอของคุณ',
  };
}

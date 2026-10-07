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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Safely obtain an active ServiceWorkerRegistration with a strict timeout
 * Never hangs indefinitely if Service Worker is not registered or supported.
 */
export async function getReadyServiceWorker(timeoutMs = 2000): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    if (typeof navigator.serviceWorker.getRegistration === 'function') {
      const existing = await navigator.serviceWorker.getRegistration().catch(() => null);
      if (!existing && typeof navigator.serviceWorker.register === 'function') {
        await navigator.serviceWorker.register('/sw.js').catch(() => null);
      }
    } else if (typeof navigator.serviceWorker.register === 'function') {
      await navigator.serviceWorker.register('/sw.js').catch(() => null);
    }

    const readyPromise = navigator.serviceWorker.ready;
    if (!readyPromise) return null;
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );

    return await Promise.race([readyPromise, timeoutPromise]);
  } catch (err) {
    console.warn('getReadyServiceWorker error:', err);
    return null;
  }
}

/**
 * Register PushSubscription with service worker and server
 */
export async function subscribeToWebPush(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return false;
  }

  try {
    const reg = await getReadyServiceWorker(2000);
    if (!reg || !reg.pushManager) return false;

    // Fetch VAPID public key with abort timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('/api/push/public-key', { signal: controller.signal }).catch(() => null);
    clearTimeout(timeoutId);
    if (!res || !res.ok) return false;
    const { publicKey } = await res.json().catch(() => ({}));
    if (!publicKey) return false;

    let subscription = await reg.pushManager.getSubscription().catch(() => null);
    if (!subscription) {
      const appServerKey = urlBase64ToUint8Array(publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey as any,
      }).catch(() => null);
    }

    if (!subscription) return false;

    const subJson = subscription.toJSON();
    const saveController = new AbortController();
    const saveTimeout = setTimeout(() => saveController.abort(), 10000);
    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subJson }),
      signal: saveController.signal,
    }).catch(() => null);
    clearTimeout(saveTimeout);

    return Boolean(saveRes && saveRes.ok);
  } catch (err) {
    console.warn('subscribeToWebPush error:', err);
    return false;
  }
}

/**
 * Request notification permission from the user (Must be triggered by a user gesture / tap)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  try {
    let perm: string = 'default';
    const reqPromise = (async () => {
      try {
        const result = Notification.requestPermission();
        if (result && typeof (result as any).then === 'function') {
          return await result;
        } else {
          return await new Promise<string>((resolve) => {
            Notification.requestPermission((p) => resolve(p));
          });
        }
      } catch {
        return Notification.permission || 'denied';
      }
    })();

    const timeoutPromise = new Promise<string>((resolve) =>
      setTimeout(() => resolve(Notification.permission || 'default'), 5000)
    );

    perm = await Promise.race([reqPromise, timeoutPromise]);
    if (perm === 'granted') {
      subscribeToWebPush().catch(() => {});
      return true;
    }
    return false;
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
  const reg = await getReadyServiceWorker(2000);
  if (reg && 'showNotification' in reg) {
    try {
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
export async function testDeviceNotification(): Promise<{
  success: boolean;
  message: string;
  nativeBannerShown?: boolean;
}> {
  // 1. ALWAYS play chime sound and trigger vibration immediately (Synchronous User Gesture)
  playSpotCheckChime(true);
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate([300, 150, 300, 150, 400]);
    } catch {}
  }

  if (!isNotificationSupported()) {
    return {
      success: true,
      nativeBannerShown: false,
      message: '🔔 ทดสอบเสียงและระบบสั่นสำเร็จ! (อุปกรณ์นี้ไม่รองรับ Notification Banner ระดับ OS)',
    };
  }

  let perm = getNotificationPermission();
  if (perm !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) {
      return {
        success: true,
        nativeBannerShown: false,
        message: '🔔 ทดสอบเสียงและสั่นสำเร็จ! (สิทธิ์แจ้งเตือนถูกปิดอยู่ กรุณาเปิดอนุญาตในการตั้งค่าเบราว์เซอร์)',
      };
    }
  }

  // Ensure push subscription is active in background without blocking
  subscribeToWebPush().catch(() => {});

  // Try Server-side Web Push first to test real background push delivery (with 8s timeout)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const pushRes = await fetch('/api/push/test', { method: 'POST', signal: controller.signal });
    clearTimeout(timeout);
    if (pushRes && pushRes.ok) {
      const data = await pushRes.json().catch(() => ({}));
      if (data && data.success) {
        return {
          success: true,
          nativeBannerShown: true,
          message: '🔔 ทดสอบเสียง, ระบบสั่น และส่ง Web Push สำเร็จ!',
        };
      }
    }
  } catch {}

  const nativeShown = await showNativeNotification({
    title: '🔔 ทดสอบการแจ้งเตือน SNU WFH',
    body: 'ระบบแจ้งเตือนทำงานได้สมบูรณ์แบบ! คุณจะไม่พลาดการสุ่มตรวจและงานสำคัญ',
    url: '/dashboard',
    sound: 'none',
    vibrate: [300, 150, 300],
    tag: 'test_notification',
    requireInteraction: false,
  });

  return {
    success: true,
    nativeBannerShown: nativeShown,
    message: nativeShown
      ? '🔔 ทดสอบเสียง, ระบบสั่น และการแจ้งเตือนสำเร็จ!'
      : '🔔 ทดสอบเสียงและระบบสั่นสำเร็จ! (หากไม่เห็นแถบ Banner ด้านบน กรุณาเปิดอนุญาต Notification ในการตั้งค่าเบราว์เซอร์)',
  };
}

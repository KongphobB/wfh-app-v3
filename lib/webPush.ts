import webpush from 'web-push';
import {
  getSubscriptionsForEmployee,
  getSubscriptionsForEmployeeAsync,
  removePushSubscriptionByEndpoint,
  getAllPushSubscriptions,
} from './pushStore';

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BF3mxYAbDHPDthi8LPeAg6S6WNskbaWK8b6zi_-b10dZz53cxqHuzjkml9h1Xx3IyVToTCVuaJABJF_Bce5AIh8';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'xArh6w6VJZzVvJC6xMoN_xvBg16npS24qOrGmLNi_yE';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:kongphopb38@gmail.com';

// Configure Web Push VAPID Details
try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('Failed to set VAPID details:', err);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
  data?: Record<string, any>;
}

/**
 * Send Web Push notification to all registered devices of an employee
 */
export async function sendPushToEmployee(
  employee_id: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await getSubscriptionsForEmployeeAsync(employee_id);
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    url: payload.url || '/dashboard',
    tag: payload.tag || `snu_push_${Date.now()}`,
    vibrate: payload.vibrate || [300, 150, 300, 150, 400],
    requireInteraction: payload.requireInteraction ?? true,
    data: {
      url: payload.url || '/dashboard',
      ...payload.data,
    },
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payloadString,
          {
            TTL: 60 * 60, // 1 hour TTL
            urgency: 'high',
          }
        );
        sent++;
      } catch (err: any) {
        failed++;
        console.warn(`Web push send error for ${sub.endpoint.slice(0, 30)}...:`, err?.statusCode || err?.message);
        // If expired or unregistered subscription (410 Gone / 404 Not Found), remove from store
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          removePushSubscriptionByEndpoint(sub.endpoint);
        }
      }
    })
  );

  return { sent, failed };
}

/**
 * Send Web Push notification to all registered devices across all employees
 */
export async function sendPushToAll(
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const allSubscriptions = getAllPushSubscriptions();
  if (allSubscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    url: payload.url || '/dashboard',
    tag: payload.tag || `snu_push_${Date.now()}`,
    vibrate: payload.vibrate || [200, 100, 200],
    requireInteraction: payload.requireInteraction ?? false,
    data: {
      url: payload.url || '/dashboard',
      ...payload.data,
    },
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    allSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payloadString
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          removePushSubscriptionByEndpoint(sub.endpoint);
        }
      }
    })
  );

  return { sent, failed };
}

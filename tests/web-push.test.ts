import { describe, it, expect, beforeEach } from 'vitest';
import {
  savePushSubscription,
  getSubscriptionsForEmployee,
  removePushSubscriptionByEndpoint,
  getAllPushSubscriptions,
} from '@/lib/pushStore';
import { sendPushToEmployee } from '@/lib/webPush';

describe('Web Push & Push Store Test Suite', () => {
  beforeEach(() => {
    (global as any).__pushSubscriptions = [];
  });

  it('1. savePushSubscription stores subscription for employee', () => {
    const sub = savePushSubscription('1304', {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-token-1',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key',
      },
    }, 'Mozilla/5.0');

    expect(sub.employee_id).toBe('1304');
    expect(sub.endpoint).toBe('https://fcm.googleapis.com/fcm/send/test-token-1');

    const empSubs = getSubscriptionsForEmployee('1304');
    expect(empSubs.length).toBe(1);
    expect(empSubs[0].id).toBe(sub.id);
  });

  it('2. savePushSubscription updates existing endpoint without duplicate', () => {
    savePushSubscription('1304', {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-token-1',
      keys: { p256dh: 'key1', auth: 'auth1' },
    });
    savePushSubscription('1304', {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-token-1',
      keys: { p256dh: 'key2', auth: 'auth2' },
    });

    const empSubs = getSubscriptionsForEmployee('1304');
    expect(empSubs.length).toBe(1);
    expect(empSubs[0].keys.p256dh).toBe('key2');
  });

  it('3. removePushSubscriptionByEndpoint removes dead endpoint', () => {
    savePushSubscription('1304', {
      endpoint: 'https://fcm.googleapis.com/fcm/send/dead-endpoint',
      keys: { p256dh: 'k', auth: 'a' },
    });
    expect(getAllPushSubscriptions().length).toBe(1);

    removePushSubscriptionByEndpoint('https://fcm.googleapis.com/fcm/send/dead-endpoint');
    expect(getAllPushSubscriptions().length).toBe(0);
  });

  it('4. sendPushToEmployee returns 0 sent when no subscription exists', async () => {
    const result = await sendPushToEmployee('9999', {
      title: 'Test',
      body: 'Test body',
    });

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });
});

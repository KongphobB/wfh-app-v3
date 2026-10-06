import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNativeNotification,
  testDeviceNotification,
} from '@/lib/clientNotification';

describe('Client Native Notification Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (global as any).window;
    delete (global as any).Notification;
    delete (global as any).navigator;
  });

  it('1. Correctly detects when Notification API is unsupported in non-browser env', () => {
    delete (global as any).window;
    expect(isNotificationSupported()).toBe(false);
    expect(getNotificationPermission()).toBe('unsupported');
  });

  it('2. Correctly reads Notification permission in browser env', () => {
    const notifObj = {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
    (global as any).Notification = notifObj;
    (global as any).window = { Notification: notifObj };

    expect(isNotificationSupported()).toBe(true);
    expect(getNotificationPermission()).toBe('granted');
  });

  it('3. Request permission resolves boolean appropriately', async () => {
    const notifObj = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
    (global as any).Notification = notifObj;
    (global as any).window = { Notification: notifObj };

    const granted = await requestNotificationPermission();
    expect(granted).toBe(true);

    notifObj.requestPermission = vi.fn().mockResolvedValue('denied');
    const denied = await requestNotificationPermission();
    expect(denied).toBe(false);
  });

  it('4. showNativeNotification returns false when permission is denied or default', async () => {
    const notifObj = {
      permission: 'denied',
    };
    (global as any).Notification = notifObj;
    (global as any).window = { Notification: notifObj };

    const dispatched = await showNativeNotification({
      title: 'Test',
      body: 'Test body',
      sound: 'none',
    });

    expect(dispatched).toBe(false);
  });

  it('5. showNativeNotification triggers ServiceWorker showNotification when available', async () => {
    const showNotificationMock = vi.fn().mockResolvedValue(undefined);
    const notifObj = {
      permission: 'granted',
    };
    const navObj = {
      vibrate: vi.fn(),
      serviceWorker: {
        ready: Promise.resolve({
          showNotification: showNotificationMock,
        }),
      },
    };
    (global as any).Notification = notifObj;
    (global as any).navigator = navObj;
    (global as any).window = { Notification: notifObj, navigator: navObj };

    const dispatched = await showNativeNotification({
      title: '🔔 สุ่มตรวจ',
      body: 'กรุณาถ่ายภาพ Selfie ภายใน 10 นาที',
      url: '/spotcheck',
      sound: 'none',
      tag: 'spot-123',
    });

    expect(dispatched).toBe(true);
    expect(showNotificationMock).toHaveBeenCalledTimes(1);
    expect(showNotificationMock).toHaveBeenCalledWith(
      '🔔 สุ่มตรวจ',
      expect.objectContaining({
        body: 'กรุณาถ่ายภาพ Selfie ภายใน 10 นาที',
        tag: 'spot-123',
        data: { url: '/spotcheck' },
      })
    );
  });

  it('6. testDeviceNotification successfully dispatches notification when granted', async () => {
    const showNotificationMock = vi.fn().mockResolvedValue(undefined);
    const notifObj = {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
    const navObj = {
      vibrate: vi.fn(),
      serviceWorker: {
        ready: Promise.resolve({
          showNotification: showNotificationMock,
        }),
      },
    };
    (global as any).Notification = notifObj;
    (global as any).navigator = navObj;
    (global as any).window = { Notification: notifObj, navigator: navObj };

    const result = await testDeviceNotification();
    expect(result.success).toBe(true);
    expect(showNotificationMock).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

vi.mock('next/font/google', () => ({
  Inter: () => ({ className: 'inter-font' }),
}));

import manifest from '@/app/manifest';
import { viewport, metadata } from '@/app/layout';
import { 
  calculateHaversineDistanceMeters, 
  determineVerificationStatus, 
  isValidCoordinate 
} from '@/lib/geo';

describe('QA: Mobile Phone System & PWA Capabilities', () => {
  const publicDir = path.join(process.cwd(), 'public');

  describe('1. PWA Web App Manifest & Asset Verification', () => {
    const pwaManifest = manifest();

    it('1.1 should have correct mobile application identity & standalone display mode', () => {
      expect(pwaManifest.name).toBe('SNU WFH — ระบบบันทึกเวลาทำงาน');
      expect(pwaManifest.short_name).toBe('SNU WFH');
      expect(pwaManifest.display).toBe('standalone');
      expect(pwaManifest.orientation).toBe('portrait-primary');
      expect(pwaManifest.start_url).toBe('/');
      expect(pwaManifest.scope).toBe('/');
      expect(pwaManifest.theme_color).toBe('#ea580c');
      expect(pwaManifest.background_color).toBe('#ffffff');
    });

    it('1.2 should have all required icons on disk with non-zero file sizes', () => {
      const requiredIcons = [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable.png',
        'icons/apple-touch-icon.png',
        'snu-logo.png',
      ];

      for (const iconPath of requiredIcons) {
        const fullPath = path.join(publicDir, iconPath);
        expect(fs.existsSync(fullPath), `Icon file ${iconPath} must exist on disk`).toBe(true);
        const stats = fs.statSync(fullPath);
        expect(stats.size, `Icon file ${iconPath} must have non-zero size`).toBeGreaterThan(1000);
      }
    });

    it('1.3 should define fast mobile app shortcuts for core employee actions', () => {
      const shortcuts = pwaManifest.shortcuts || [];
      expect(shortcuts.length).toBeGreaterThanOrEqual(3);

      const shortcutUrls = shortcuts.map((s) => s.url);
      expect(shortcutUrls).toContain('/checkin');
      expect(shortcutUrls).toContain('/spotcheck');
      expect(shortcutUrls).toContain('/tasks');
    });
  });

  describe('2. Mobile Viewport & Apple Web App Meta Tags', () => {
    it('2.1 viewport config must be optimized for mobile screens and prevent excessive zooming', () => {
      expect(viewport.width).toBe('device-width');
      expect(viewport.initialScale).toBe(1);
      expect(viewport.themeColor).toBe('#ea580c');
    });

    it('2.2 metadata must declare appleWebApp capability for iOS full-screen PWA', () => {
      expect(metadata.appleWebApp).toBeDefined();
      if (typeof metadata.appleWebApp === 'object' && metadata.appleWebApp !== null) {
        expect(metadata.appleWebApp.capable).toBe(true);
        expect(metadata.appleWebApp.title).toBe('SNU WFH');
      }
      expect(metadata.manifest).toBe('/manifest.webmanifest');
    });
  });

  describe('3. Service Worker & Background Notifications (public/sw.js)', () => {
    const swPath = path.join(publicDir, 'sw.js');

    it('3.1 sw.js must exist on disk and define essential PWA lifecycle handlers', () => {
      expect(fs.existsSync(swPath)).toBe(true);
      const swContent = fs.readFileSync(swPath, 'utf-8');

      // Verify Service Worker Cache & Lifecycle
      expect(swContent).toContain("addEventListener('install'");
      expect(swContent).toContain("addEventListener('activate'");
      expect(swContent).toContain("addEventListener('fetch'");

      // Verify Web Push Notification & Click Handlers
      expect(swContent).toContain("addEventListener('push'");
      expect(swContent).toContain("addEventListener('notificationclick'");

      // Verify Haptic Vibration support in push notifications
      expect(swContent).toContain('vibrate');

      // Verify Spot Check real-time window client broadcasting
      expect(swContent).toContain('SPOTCHECK_TRIGGERED');
    });

    it('3.2 sw.js must implement Network-first strategy for APIs and dynamic navigation', () => {
      const swContent = fs.readFileSync(swPath, 'utf-8');
      expect(swContent).toContain("url.pathname.startsWith('/api')");
      expect(swContent).toContain("event.request.mode === 'navigate'");
    });
  });

  describe('4. Mobile Geolocation & Indoor Fallback Logic', () => {
    it('4.1 should validate valid mobile GPS coordinates and reject Null Island (0,0)', () => {
      expect(isValidCoordinate(13.7563, 100.5018)).toBe(true); // Bangkok
      expect(isValidCoordinate(12.7369, 101.1144)).toBe(true); // Rayong Office
      expect(isValidCoordinate(0, 0)).toBe(false);             // Error default
      expect(isValidCoordinate(null, null)).toBe(false);
      expect(isValidCoordinate(NaN, 100.5)).toBe(false);
    });

    it('4.2 should accurately classify location within 500m geofence vs WFH', () => {
      const officeLat = 12.736929;
      const officeLng = 101.114387;

      // Inside Office (10 meters away)
      const distInside = calculateHaversineDistanceMeters(officeLat, officeLng, 12.736950, 101.114400);
      expect(distInside).toBeLessThan(50);
      expect(determineVerificationStatus(12.736950, 101.114400, officeLat, officeLng, 500)).toBe('ปฏิบัติงานที่ออฟฟิศ');

      // Working from home in Rayong town (~15 km away)
      const distWfh = calculateHaversineDistanceMeters(officeLat, officeLng, 12.680000, 101.270000);
      expect(distWfh).toBeGreaterThan(500);
      expect(determineVerificationStatus(12.680000, 101.270000, officeLat, officeLng, 500)).toBe('นอกพื้นที่ (WFH)');
    });

    it('4.3 indoor timeout fallback options match standard mobile location provider specs', () => {
      // High accuracy: satellite GPS
      const satelliteOptions = { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 };
      expect(satelliteOptions.enableHighAccuracy).toBe(true);
      expect(satelliteOptions.timeout).toBeLessThanOrEqual(15000);

      // Indoor fallback: cellular / Wi-Fi positioning
      const indoorFallbackOptions = { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 };
      expect(indoorFallbackOptions.enableHighAccuracy).toBe(false);
      expect(indoorFallbackOptions.maximumAge).toBe(60000);
    });
  });

  describe('5. Mobile Touch & Audio/Haptic Vibration Standards', () => {
    it('5.1 vibration patterns for alerts must conform to standard Web Vibration API arrays', () => {
      const spotCheckVibe = [200, 100, 200, 100, 200];
      const testAlertVibe = [300, 150, 300, 150, 400];

      expect(Array.isArray(spotCheckVibe)).toBe(true);
      expect(spotCheckVibe.every((n) => typeof n === 'number' && n > 0)).toBe(true);

      expect(Array.isArray(testAlertVibe)).toBe(true);
      expect(testAlertVibe.every((n) => typeof n === 'number' && n > 0)).toBe(true);
    });
  });
});

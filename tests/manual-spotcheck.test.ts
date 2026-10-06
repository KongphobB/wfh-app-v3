import { describe, it, expect, beforeEach } from 'vitest';
import { addManualSpotCheck, getActiveManualSpotChecks, updateManualSpotCheck } from '@/lib/manualSpotCheckStore';
import { getThaiDateStr } from '@/lib/timeSync';
import { SpotCheck } from '@/types';

describe('Manual Spot Check Store & Delivery Tests', () => {
  const todayStr = getThaiDateStr();

  it('1. Adds manual spot check and retrieves it for specific employee', () => {
    const testCheck: SpotCheck = {
      id: `SPOT-MANUAL-${Date.now()}-1304`,
      employee_id: '1304',
      check_date: todayStr,
      round: 'เฉพาะกิจ (หัวหน้าสั่งตรวจ)',
      scheduled_time: '16:00:00',
      actual_scan_time: null,
      gps_lat: null,
      gps_lng: null,
      photo_url: null,
      result_status: 'Scheduled',
      created_at: new Date().toISOString(),
    };

    addManualSpotCheck(testCheck);

    const activeChecks = getActiveManualSpotChecks('1304');
    expect(activeChecks.length).toBeGreaterThan(0);
    const found = activeChecks.find((c) => c.id === testCheck.id);
    expect(found).toBeDefined();
    expect(found?.result_status).toBe('Scheduled');
  });

  it('2. Updates manual spot check to Pass on completion', () => {
    const checkId = `SPOT-MANUAL-${Date.now()}-1304`;
    const testCheck: SpotCheck = {
      id: checkId,
      employee_id: '1304',
      check_date: todayStr,
      round: 'เฉพาะกิจ (หัวหน้าสั่งตรวจ)',
      scheduled_time: '16:05:00',
      actual_scan_time: null,
      gps_lat: null,
      gps_lng: null,
      photo_url: null,
      result_status: 'Scheduled',
      created_at: new Date().toISOString(),
    };

    addManualSpotCheck(testCheck);

    const updated = updateManualSpotCheck(checkId, {
      result_status: 'Pass',
      actual_scan_time: new Date().toISOString(),
      gps_lat: 12.7368,
      gps_lng: 101.1143,
    });

    expect(updated).toBeDefined();
    expect(updated?.result_status).toBe('Pass');
    expect(updated?.actual_scan_time).toBeDefined();
  });
});

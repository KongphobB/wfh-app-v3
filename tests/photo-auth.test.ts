import { describe, it, expect, vi } from 'vitest';
import { isAuthorizedToViewPhoto } from '@/app/api/checkin/photo/route';
import { associatePhotoOwner } from '@/lib/photoStore';

vi.mock('@/lib/gas', () => ({
  callGAS: vi.fn(async (action: string) => {
    if (action === 'getLogs') {
      return {
        logs: [
          { uuid: 'uuid-alice-opaque-123', employeeId: '1001' },
          { uuid: 'uuid-bob-opaque-456', employeeId: '1002' },
        ],
      };
    }
    if (action === 'getSpotChecks') {
      return {
        spotChecks: [
          { uuid: 'uuid-spot-alice-789', employeeId: '1001' },
          { uuid: 'uuid-spot-bob-999', employeeId: '1002' },
        ],
      };
    }
    return {};
  }),
  getLiveEmployeesMap: vi.fn(async () => ({
    '1001': { name: 'Alice', supervisorId: '8888', dept: 'IT' },
    '1002': { name: 'Bob', supervisorId: '7777', dept: 'HR' },
    '8888': { name: 'Supervisor IT', supervisorId: '9999', dept: 'IT' },
    '7777': { name: 'Supervisor HR', supervisorId: '9999', dept: 'HR' },
    '9999': { name: 'Admin', supervisorId: '', dept: 'ผู้ดูแลระบบ' },
  })),
}));

describe('Photo IDOR Authorization Security (SEC-01)', () => {
  describe('1. Admin Role Access', () => {
    const adminSession = { role: 'admin', employee_id: '9999' };

    it('Allows Admin to view any photo regardless of ownership', async () => {
      expect(await isAuthorizedToViewPhoto('1001_2026-10-15_08:00:00', adminSession)).toBe(true);
      expect(await isAuthorizedToViewPhoto('uuid-bob-opaque-456', adminSession)).toBe(true);
      expect(await isAuthorizedToViewPhoto('SPOT-MANUAL-2026-10-15-1002', adminSession)).toBe(true);
      expect(await isAuthorizedToViewPhoto('completely-unknown-uuid', adminSession)).toBe(true);
    });
  });

  describe('2. Regular Employee Access (Zero IDOR)', () => {
    const aliceSession = { role: 'employee', employee_id: '1001' };

    it('Allows employee to view their own composite key photos', async () => {
      expect(await isAuthorizedToViewPhoto('1001_2026-10-15_08:00:00', aliceSession)).toBe(true);
      expect(await isAuthorizedToViewPhoto('spot_1001_2026-10-15_chk01', aliceSession)).toBe(true);
      expect(await isAuthorizedToViewPhoto('SPOT-MANUAL-2026-10-15-1001', aliceSession)).toBe(true);
    });

    it('Allows employee to view their own opaque photo resolved from GAS logs', async () => {
      expect(await isAuthorizedToViewPhoto('uuid-alice-opaque-123', aliceSession)).toBe(true);
      expect(await isAuthorizedToViewPhoto('uuid-spot-alice-789', aliceSession)).toBe(true);
    });

    it('Blocks employee from viewing colleagues photos (IDOR attack prevention)', async () => {
      expect(await isAuthorizedToViewPhoto('1002_2026-10-15_08:00:00', aliceSession)).toBe(false);
      expect(await isAuthorizedToViewPhoto('spot_1002_2026-10-15_chk01', aliceSession)).toBe(false);
      expect(await isAuthorizedToViewPhoto('SPOT-MANUAL-2026-10-15-1002', aliceSession)).toBe(false);
      expect(await isAuthorizedToViewPhoto('uuid-bob-opaque-456', aliceSession)).toBe(false);
      expect(await isAuthorizedToViewPhoto('uuid-spot-bob-999', aliceSession)).toBe(false);
    });

    it('Blocks employee from arbitrary unknown UUIDs', async () => {
      expect(await isAuthorizedToViewPhoto('arbitrary-uuid-attacker-guess', aliceSession)).toBe(false);
    });
  });

  describe('3. Supervisor Scope Access', () => {
    const supervisorItSession = { role: 'supervisor', employee_id: '8888' };

    it('Allows supervisor to view their own photos', async () => {
      expect(await isAuthorizedToViewPhoto('8888_2026-10-15_08:00:00', supervisorItSession)).toBe(true);
    });

    it('Allows supervisor to view photos of their subordinate (Alice 1001)', async () => {
      expect(await isAuthorizedToViewPhoto('1001_2026-10-15_08:00:00', supervisorItSession)).toBe(true);
      expect(await isAuthorizedToViewPhoto('spot_1001_2026-10-15_chk01', supervisorItSession)).toBe(true);
      expect(await isAuthorizedToViewPhoto('uuid-alice-opaque-123', supervisorItSession)).toBe(true);
    });

    it('Blocks supervisor from viewing employees outside their team (Bob 1002 is under 7777)', async () => {
      expect(await isAuthorizedToViewPhoto('1002_2026-10-15_08:00:00', supervisorItSession)).toBe(false);
      expect(await isAuthorizedToViewPhoto('spot_1002_2026-10-15_chk01', supervisorItSession)).toBe(false);
      expect(await isAuthorizedToViewPhoto('uuid-bob-opaque-456', supervisorItSession)).toBe(false);
    });
  });

  describe('4. In-Memory Store Photo Ownership Association', () => {
    const aliceSession = { role: 'employee', employee_id: '1001' };
    const bobSession = { role: 'employee', employee_id: '1002' };

    it('Respects dynamically associated photo owners', async () => {
      const dynamicUuid = 'dynamic-selfie-custom-key-9988';
      associatePhotoOwner(dynamicUuid, '1001');

      expect(await isAuthorizedToViewPhoto(dynamicUuid, aliceSession)).toBe(true);
      expect(await isAuthorizedToViewPhoto(dynamicUuid, bobSession)).toBe(false);
    });
  });
});

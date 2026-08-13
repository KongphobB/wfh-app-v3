import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Mock Next.js & Server Modules
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.jpg' } }),
      }),
    },
  },
}));

vi.mock('@/lib/notifications', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';
import { POST as checkinPOST } from '@/app/api/checkin/route';
import { GET as spotcheckTickGET } from '@/app/api/spotcheck/tick/route';
import { POST as spotcheckPOST } from '@/app/api/spotcheck/route';

const TEST_CRON_SECRET = '9a14146f08f8d44d333bcad0a816ab732ab708ffeadf9b535f57efa174aaf613';

/**
 * Robust chainable mock helper for Supabase QueryBuilder
 */
function createChainableMock(resolvedData: any = null) {
  const chain: any = {
    select: () => chain,
    insert: () => Promise.resolve({ error: null, data: resolvedData }),
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    in: () => chain,
    lt: () => chain,
    lte: () => chain,
    gt: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve({ data: resolvedData }),
    then: (resolve: any) => resolve({ data: resolvedData, error: null }),
  };
  return chain;
}

function createCronRequest() {
  return new Request('http://localhost/api/spotcheck/tick', {
    headers: { Authorization: `Bearer ${TEST_CRON_SECRET}` },
  });
}

describe('WFH Business Rules 1 - 4 Test Suite', () => {
  const mockUserSession = {
    employee_id: '1001',
    name: 'พนักงาน สมชาย',
    role: 'employee' as const,
    department: 'Software Engineering',
    force_pin_change: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = TEST_CRON_SECRET;
    (getSession as any).mockResolvedValue(mockUserSession);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // RULE 1 TESTS — เข้างานสาย (Cutoff 08:00:00 น.)
  // =========================================================================
  describe('Rule 1 — Morning Check-in Late Cutoff (08:00:00 AM)', () => {
    it('1.1 Rejects morning check-in after 08:00 AM without note with 400 error', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 8, 15, 0));

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') {
          return createChainableMock({ position: 'Developer', supervisor_id: '0002', name: 'พนักงาน สมชาย' });
        }
        if (table === 'app_config' || table === 'checkin_logs' || table === 'spot_checks') {
          return createChainableMock([]);
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'เข้างาน',
          gps_lat: 13.8000,
          gps_lng: 100.6000,
          photo_base64: 'data:image/jpeg;base64,mock',
          note: '', // Empty note
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('เนื่องจากคุณเข้างานหลังเวลา 08:00 น. กรุณากรอกเหตุผลกรณีเข้าสายด้วยครับ');
    });

    it('1.2 Accepts morning check-in after 08:00 AM when note is provided (WFH -> เข้างานสาย)', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 8, 15, 0));

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') {
          return createChainableMock({ position: 'Developer', supervisor_id: '0002', name: 'พนักงาน สมชาย' });
        }
        if (table === 'app_config' || table === 'checkin_logs' || table === 'spot_checks') {
          return createChainableMock([]);
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'เข้างาน',
          gps_lat: 13.8000, // WFH
          gps_lng: 100.6000,
          photo_base64: 'data:image/jpeg;base64,mock',
          note: 'รถติดหนักมากครับ',
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.log.verification_status).toBe('เข้างานสาย');
    });

    it('1.3 Sets verification_status to ปฏิบัติงานที่ออฟฟิศ if late check-in is physically at office', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 8, 15, 0));

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') {
          return createChainableMock({ position: 'Developer', supervisor_id: '0002', name: 'พนักงาน สมชาย' });
        }
        if (table === 'app_config' || table === 'checkin_logs' || table === 'spot_checks') {
          return createChainableMock([]);
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'เข้างาน',
          gps_lat: 13.7563, // Exact office location
          gps_lng: 100.5018,
          photo_base64: 'data:image/jpeg;base64,mock',
          note: 'เข้าสายเพราะติดธุระ',
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.log.verification_status).toBe('ปฏิบัติงานที่ออฟฟิศ');
    });
  });

  // =========================================================================
  // RULE 2 TESTS — ยืนยันตัวตนรอบ 2 (13:00-13:20, GPS <= 20km)
  // =========================================================================
  describe('Rule 2 — Round 2 Verification (13:00-13:20, GPS <= 20km)', () => {
    const mockFirstCheckIn = {
      id: 'log-1',
      employee_id: '1001',
      log_type: 'เข้างาน',
      log_date: '2026-08-13',
      gps_lat: 13.7500,
      gps_lng: 100.5000,
      verification_status: 'นอกพื้นที่ (WFH)',
    };

    it('2.1 Rejects Round 2 verification submitted before 13:00 PM', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 12, 45, 0)); // 12:45 PM

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') return createChainableMock({});
        if (table === 'app_config') return createChainableMock([]);
        if (table === 'checkin_logs') {
          const chain = createChainableMock();
          chain.select = (cols: string) => {
            if (cols === '*') return createChainableMock(mockFirstCheckIn);
            return createChainableMock(null); // No duplicate!
          };
          return chain;
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ยืนยันตัวตน',
          gps_lat: 13.7500,
          gps_lng: 100.5000,
          photo_base64: 'data:image/jpeg;base64,mock',
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('การยืนยันตัวตนรอบที่ 2 จะต้องทำตั้งแต่เวลา 13:00 น. เป็นต้นไป');
    });

    it('2.2 Rejects Round 2 verification after 13:20 PM without note', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 13, 45, 0)); // 13:45 PM

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') return createChainableMock({});
        if (table === 'app_config') return createChainableMock([]);
        if (table === 'checkin_logs') {
          const chain = createChainableMock();
          chain.select = (cols: string) => {
            if (cols === '*') return createChainableMock(mockFirstCheckIn);
            return createChainableMock(null); // No duplicate
          };
          return chain;
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ยืนยันตัวตน',
          gps_lat: 13.7500,
          gps_lng: 100.5000,
          photo_base64: 'data:image/jpeg;base64,mock',
          note: '', // Empty note
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('เนื่องจากคุณยืนยันตัวตนหลังเวลา 13:20 น. กรุณากรอกเหตุผลกรณีล่าช้าด้วยครับ');
    });

    it('2.3 Rejects Round 2 verification if distance > 20km without out_of_bounds_reason with formatted actual distance', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 13, 10, 0)); // 13:10 PM

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') return createChainableMock({});
        if (table === 'app_config') return createChainableMock([]);
        if (table === 'checkin_logs') {
          const chain = createChainableMock();
          chain.select = (cols: string) => {
            if (cols === '*') return createChainableMock(mockFirstCheckIn);
            return createChainableMock(null);
          };
          return chain;
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ยืนยันตัวตน',
          gps_lat: 14.0000, // Distance ~27.80 km (>20km)
          gps_lng: 100.5000,
          photo_base64: 'data:image/jpeg;base64,mock',
          out_of_bounds_reason: '', // Missing reason
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/ตำแหน่งพิกัดของคุณอยู่ห่างจากจุดเช็คอินแรกถึง 27\.\d{2} กม\. \(เกิน 20 กม\.\) กรุณาระบุเหตุผลการเคลื่อนย้ายสถานที่ด้วยครับ/);
    });

    it('2.4 Rejects when both late AND out-of-bounds trigger, but only note is supplied and out_of_bounds_reason is missing', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 13, 45, 0)); // 13:45 PM (Late)

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') return createChainableMock({});
        if (table === 'app_config') return createChainableMock([]);
        if (table === 'checkin_logs') {
          const chain = createChainableMock();
          chain.select = (cols: string) => {
            if (cols === '*') return createChainableMock(mockFirstCheckIn);
            return createChainableMock(null);
          };
          return chain;
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ยืนยันตัวตน',
          gps_lat: 14.0000, // Out of bounds (~27.8km)
          gps_lng: 100.5000,
          photo_base64: 'data:image/jpeg;base64,mock',
          note: 'เหตุผลสายครับ', // Note supplied
          out_of_bounds_reason: '', // BUT movement reason missing!
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/กรุณาระบุเหตุผลการเคลื่อนย้ายสถานที่ด้วยครับ/);
    });

    it('2.5 Rejects Round 2 if first check-in of today was at office', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 13, 10, 0)); // 13:10 PM

      const officeFirstCheckIn = {
        ...mockFirstCheckIn,
        verification_status: 'ปฏิบัติงานที่ออฟฟิศ',
      };

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') return createChainableMock({});
        if (table === 'app_config') return createChainableMock([]);
        if (table === 'checkin_logs') {
          return createChainableMock(officeFirstCheckIn);
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ยืนยันตัวตน',
          gps_lat: 13.7500,
          gps_lng: 100.5000,
          photo_base64: 'data:image/jpeg;base64,mock',
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('ได้รับการยกเว้นไม่ต้องยืนยันตัวตนรอบ 2');
    });

    it('2.6 Rejects duplicate Round 2 submission on same day', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 13, 10, 0));

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') return createChainableMock({});
        if (table === 'app_config') return createChainableMock([]);
        if (table === 'checkin_logs') {
          const chain = createChainableMock();
          chain.select = (cols: string) => {
            if (cols === '*') return createChainableMock(mockFirstCheckIn);
            return createChainableMock({ id: 'existing-verify-id' }); // Duplicate found!
          };
          return chain;
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ยืนยันตัวตน',
          gps_lat: 13.7500,
          gps_lng: 100.5000,
          photo_base64: 'data:image/jpeg;base64,mock',
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('คุณได้รับการยืนยันตัวตนรอบ 2 ของวันนี้เรียบร้อยแล้ว');
    });

    it('2.7 Rejects Round 2 if no morning check-in record exists for today', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 13, 10, 0));

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') return createChainableMock({});
        if (table === 'app_config') return createChainableMock([]);
        if (table === 'checkin_logs') {
          return createChainableMock(null); // No morning checkin!
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ยืนยันตัวตน',
          gps_lat: 13.7500,
          gps_lng: 100.5000,
          photo_base64: 'data:image/jpeg;base64,mock',
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('ยังไม่มีการบันทึกเวลาเข้างานของวันนี้');
    });

    it('2.8 Normal Round 2 verification succeeds with verification_status = ยืนยันตัวตนรอบ 2 สำเร็จ', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 13, 10, 0)); // 13:10 PM

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') return createChainableMock({});
        if (table === 'app_config') return createChainableMock([]);
        if (table === 'checkin_logs') {
          const chain = createChainableMock();
          chain.select = (cols: string) => {
            if (cols === '*') return createChainableMock(mockFirstCheckIn);
            return createChainableMock(null);
          };
          return chain;
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ยืนยันตัวตน',
          gps_lat: 13.7500,
          gps_lng: 100.5000,
          photo_base64: 'data:image/jpeg;base64,mock',
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.log.verification_status).toBe('ยืนยันตัวตนรอบ 2 สำเร็จ');
    });

    it('2.9 Late or out of bounds Round 2 verification triggers createNotification for supervisor', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 13, 45, 0)); // 13:45 PM (Late)

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') {
          return createChainableMock({ supervisor_id: '0002', name: 'พนักงาน สมชาย' });
        }
        if (table === 'app_config') return createChainableMock([]);
        if (table === 'checkin_logs') {
          const chain = createChainableMock();
          chain.select = (cols: string) => {
            if (cols === '*') return createChainableMock(mockFirstCheckIn);
            return createChainableMock(null);
          };
          return chain;
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ยืนยันตัวตน',
          gps_lat: 13.7500,
          gps_lng: 100.5000,
          photo_base64: 'data:image/jpeg;base64,mock',
          note: 'รถเสียครับเลยมาสาย',
        }),
      });

      const res = await checkinPOST(req);
      expect(res.status).toBe(200);

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: '0002',
          title: expect.stringContaining('แจ้งเตือนยืนยันตัวตนรอบ 2'),
        })
      );
    });
  });

  // =========================================================================
  // RULE 3 TESTS — Random Spot Check
  // =========================================================================
  describe('Rule 3 — Random Spot Check (Tick & Submission)', () => {
    it('3.1 Skips spot check tick on weekends (Saturday / Sunday)', async () => {
      // 2026-08-15 is Saturday
      vi.setSystemTime(new Date(2026, 7, 15, 10, 0, 0));

      const res = await spotcheckTickGET(createCronRequest());
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe('วันหยุดเสาร์-อาทิตย์ ข้ามการสุ่มตรวจ');
    });

    it('3.2 Spot check random times fall in 09:00-11:00 (morning) and 14:00-16:00 (afternoon) uniform random across seconds', async () => {
      const morningSeconds: number[] = [];
      const afternoonSeconds: number[] = [];

      for (let i = 0; i < 1000; i++) {
        const morningOffsetSec = Math.floor(Math.random() * 7200);
        const morningTotalSec = 9 * 3600 + morningOffsetSec;
        morningSeconds.push(morningTotalSec);

        const afternoonOffsetSec = Math.floor(Math.random() * 7200);
        const afternoonTotalSec = 14 * 3600 + afternoonOffsetSec;
        afternoonSeconds.push(afternoonTotalSec);
      }

      morningSeconds.forEach((sec) => {
        expect(sec).toBeGreaterThanOrEqual(9 * 3600);
        expect(sec).toBeLessThan(11 * 3600);
      });

      afternoonSeconds.forEach((sec) => {
        expect(sec).toBeGreaterThanOrEqual(14 * 3600);
        expect(sec).toBeLessThan(16 * 3600);
      });

      const oddSecondsCount = morningSeconds.filter((s) => s % 2 !== 0).length;
      expect(oddSecondsCount).toBeGreaterThan(350);
      expect(oddSecondsCount).toBeLessThan(650);
    });

    it('3.3 Sweeps pending spot checks older than 10.5 minutes (630s) as ไม่ผ่านการสุ่มตรวจ (ขาดการติดต่อ)', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 10, 15, 0)); // Thursday

      const mockExpiredRecords = [{ id: 'spot-99', result_status: 'ไม่ผ่านการสุ่มตรวจ (ขาดการติดต่อ)' }];

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'spot_checks') {
          return createChainableMock(mockExpiredRecords);
        }
        return createChainableMock();
      });

      const res = await spotcheckTickGET(createCronRequest());
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.sweptExpiredChecks).toBe(1);
    });

    it('3.4 Submitting spot check response with GPS > 20km from first check-in results in Fail status with distance', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 10, 10, 0));

      const mockFirstCheckIn = {
        gps_lat: 13.7500,
        gps_lng: 100.5000,
      };

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'checkin_logs') {
          return createChainableMock(mockFirstCheckIn);
        }
        if (table === 'spot_checks') {
          return createChainableMock({ error: null });
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/spotcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spot_check_id: 'spot-1',
          gps_lat: 14.0000, // Distance ~27.80 km (>20km)
          gps_lng: 100.5000,
        }),
      });

      const res = await spotcheckPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.result_status).toMatch(/ไม่ผ่านการสุ่มตรวจ \(นอกพื้นที่ 27\.\d{2} กม\.\)/);
    });

    it('3.5 Submitting spot check response within 20km results in Pass status', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 10, 10, 0));

      const mockFirstCheckIn = {
        gps_lat: 13.7500,
        gps_lng: 100.5000,
      };

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'checkin_logs') {
          return createChainableMock(mockFirstCheckIn);
        }
        if (table === 'spot_checks') {
          return createChainableMock({ error: null });
        }
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/spotcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spot_check_id: 'spot-1',
          gps_lat: 13.7510, // Close distance (~0.1km)
          gps_lng: 100.5010,
        }),
      });

      const res = await spotcheckPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.result_status).toBe('Pass');
    });
  });

  // =========================================================================
  // RULE 4 TESTS — ออกงานก่อน 17:00 (Early Leave)
  // =========================================================================
  describe('Rule 4 — Early Leave (Before 17:00 PM)', () => {
    it('4.1 Rejects early leave before 17:00 PM without note', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 16, 30, 0)); // 16:30 PM

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') return createChainableMock({});
        if (table === 'app_config' || table === 'checkin_logs') return createChainableMock([]);
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ออกงาน',
          gps_lat: 13.7563,
          gps_lng: 100.5018,
          photo_base64: 'data:image/jpeg;base64,mock',
          note: '', // Empty note
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('เนื่องจากคุณออกงานก่อนเวลา 17:00 น. กรุณากรอกเหตุผลกรณีออกก่อนเวลาด้วยครับ');
    });

    it('4.2 Accepts early leave before 17:00 PM with note and sets is_early_leave = true', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 16, 30, 0)); // 16:30 PM

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') return createChainableMock({});
        if (table === 'app_config' || table === 'checkin_logs') return createChainableMock([]);
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ออกงาน',
          gps_lat: 13.7563,
          gps_lng: 100.5018,
          photo_base64: 'data:image/jpeg;base64,mock',
          note: 'นัดคุณหมอไว้ครับ',
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.log.is_early_leave).toBe(true);
      expect(data.log.verification_status).toBe('ออกงานก่อนเวลา');
    });

    it('4.3 Allows leave on or after 17:00:00 PM without note and sets is_early_leave = false', async () => {
      vi.setSystemTime(new Date(2026, 7, 13, 17, 5, 0)); // 17:05 PM

      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'employees') return createChainableMock({});
        if (table === 'app_config' || table === 'checkin_logs') return createChainableMock([]);
        return createChainableMock();
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ออกงาน',
          gps_lat: 13.7563,
          gps_lng: 100.5018,
          photo_base64: 'data:image/jpeg;base64,mock',
          note: '',
        }),
      });

      const res = await checkinPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.log.is_early_leave).toBe(false);
    });
  });
});

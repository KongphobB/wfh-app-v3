import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/checkin/route';
import { getSession } from '@/lib/auth';
import { callGAS } from '@/lib/gas';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/gas', () => ({
  callGAS: vi.fn(),
  getLiveEmployeesMap: vi.fn(async () => ({
    '1001': { name: 'Alice', position: 'Developer', supervisorId: '8888', dept: 'IT' },
  })),
  invalidateGasCache: vi.fn(),
}));

vi.mock('@/lib/photoExempt', () => ({
  isEmployeePhotoExempt: vi.fn(async () => true),
}));

describe('Check-in Business Rules: Double Check-in & Checkout Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as any).mockResolvedValue({
      employee_id: '1001',
      name: 'Alice',
      role: 'employee',
      department: 'IT',
    });
  });

  describe('Rule 1: Double Check-in Prevention', () => {
    it('Blocks double check-in when an "เข้างาน" record already exists for today', async () => {
      const { getThaiDateStr } = await import('@/lib/timeSync');
      const today = getThaiDateStr();

      (callGAS as any).mockImplementation(async (action: string) => {
        if (action === 'getLogs') {
          return {
            data: [
              {
                date: today,
                time: '07:55:00',
                employeeId: '1001',
                type: 'เข้างาน',
              },
            ],
          };
        }
        return { success: true };
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'เข้างาน',
          gps_lat: 12.736929,
          gps_lng: 101.114387,
          note: 'ลองเช็คอินซ้ำ',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain('คุณได้ลงเวลาเข้างานของวันนี้เรียบร้อยแล้ว');
      expect(json.error).toContain('07:55');
    });

    it('Allows morning check-in if no previous "เข้างาน" log exists for today', async () => {
      (callGAS as any).mockImplementation(async (action: string) => {
        if (action === 'getLogs') {
          return { data: [] };
        }
        if (action === 'getSystemConfig') {
          return { config: {} };
        }
        if (action === 'checkin') {
          return { success: true, message: 'บันทึกสำเร็จ', data: { uuid: 'new-uuid-001' } };
        }
        return { success: true };
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'เข้างาน',
          gps_lat: 12.736929,
          gps_lng: 101.114387,
          note: 'เข้างานตามปกติ',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('Rule 2: Checkout Prerequisites & Double Checkout Prevention', () => {
    it('Blocks checkout if employee has NOT checked in today', async () => {
      (callGAS as any).mockImplementation(async (action: string) => {
        if (action === 'getLogs') {
          return { data: [] }; // No check-in log exists
        }
        return { success: true };
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ออกงาน',
          gps_lat: 12.736929,
          gps_lng: 101.114387,
          note: 'กดออกงานโดยไม่ได้เข้างาน',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain('ไม่พบข้อมูลการลงเวลาเข้างานของวันนี้');
    });

    it('Blocks double checkout when an "ออกงาน" log already exists for today', async () => {
      const { getThaiDateStr } = await import('@/lib/timeSync');
      const today = getThaiDateStr();

      (callGAS as any).mockImplementation(async (action: string) => {
        if (action === 'getLogs') {
          return {
            data: [
              { date: today, time: '08:00:00', employeeId: '1001', type: 'เข้างาน' },
              { date: today, time: '17:05:00', employeeId: '1001', type: 'ออกงาน' },
            ],
          };
        }
        return { success: true };
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ออกงาน',
          gps_lat: 12.736929,
          gps_lng: 101.114387,
          note: 'กดออกงานซ้ำ',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain('คุณได้ลงเวลาออกงานของวันนี้เรียบร้อยแล้ว');
      expect(json.error).toContain('17:05');
    });

    it('Allows checkout if employee has checked in today and has not checked out yet', async () => {
      const { getThaiDateStr } = await import('@/lib/timeSync');
      const today = getThaiDateStr();

      (callGAS as any).mockImplementation(async (action: string) => {
        if (action === 'getLogs') {
          return {
            data: [
              { date: today, time: '08:00:00', employeeId: '1001', type: 'เข้างาน' },
            ],
          };
        }
        if (action === 'getSystemConfig') {
          return { config: {} };
        }
        if (action === 'checkin') {
          return { success: true, message: 'บันทึกสำเร็จ', data: { uuid: 'new-uuid-out-001' } };
        }
        return { success: true };
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ออกงาน',
          gps_lat: 12.736929,
          gps_lng: 101.114387,
          note: 'เลิกงานเรียบร้อย',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('Rule 3: Duplicate Afternoon Verification Prevention & Prerequisites', () => {
    it('Blocks afternoon verification if employee has NOT checked in today', async () => {
      (callGAS as any).mockImplementation(async (action: string) => {
        if (action === 'getLogs') {
          return { data: [] };
        }
        return { success: true };
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ยืนยันตัวตน',
          gps_lat: 12.736929,
          gps_lng: 101.114387,
          note: 'ยืนยันตัวตนโดยยังไม่เข้างาน',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain('ไม่พบข้อมูลการลงเวลาเข้างานของวันนี้');
    });

    it('Allows afternoon verification even when an earlier manual spot check log (type="ยืนยันตัวตน" with [สุ่มตรวจเฉพาะกิจ] note) exists', async () => {
      const timeSync = await import('@/lib/timeSync');
      const today = timeSync.getThaiDateStr();
      const timeSpy = vi.spyOn(timeSync, 'getThaiTime').mockReturnValue({
        hour: 13,
        minute: 10,
        second: 0,
        timeStr: '13:10',
      });

      (callGAS as any).mockImplementation(async (action: string) => {
        if (action === 'getLogs') {
          return {
            data: [
              { date: today, time: '08:00:00', employeeId: '1001', type: 'เข้างาน' },
              {
                date: today,
                time: '10:15:00',
                employeeId: '1001',
                type: 'ยืนยันตัวตน',
                note: '[สุ่มตรวจเฉพาะกิจ] ยืนยันตัวตนสำเร็จ (SPOT-MANUAL-123)',
              },
            ],
          };
        }
        if (action === 'getSystemConfig') {
          return { config: {} };
        }
        if (action === 'checkin') {
          return { success: true, message: 'บันทึกสำเร็จ', data: { uuid: 'new-uuid-verify-001' } };
        }
        return { success: true };
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ยืนยันตัวตน',
          gps_lat: 12.736929,
          gps_lng: 101.114387,
          note: 'ยืนยันตัวตนรอบบ่ายตามปกติ',
        }),
      });

      const res = await POST(req);
      timeSpy.mockRestore();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('Blocks duplicate afternoon verification on the same day', async () => {
      const { getThaiDateStr } = await import('@/lib/timeSync');
      const today = getThaiDateStr();

      (callGAS as any).mockImplementation(async (action: string) => {
        if (action === 'getLogs') {
          return {
            data: [
              { date: today, time: '08:00:00', employeeId: '1001', type: 'เข้างาน' },
              { date: today, time: '13:05:00', employeeId: '1001', type: 'ยืนยันตัวตน' },
            ],
          };
        }
        return { success: true };
      });

      const req = new Request('http://localhost/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: 'ยืนยันตัวตน',
          gps_lat: 12.736929,
          gps_lng: 101.114387,
          note: 'ยืนยันตัวตนรอบบ่าย',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain('คุณได้ยืนยันตัวตนของวันนี้เรียบร้อยแล้ว');
      expect(json.error).toContain('13:05');
    });
  });
});

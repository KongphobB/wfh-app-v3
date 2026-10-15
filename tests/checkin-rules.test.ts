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

describe('Check-in Business Rules: Double Check-in Prevention (Rule 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as any).mockResolvedValue({
      employee_id: '1001',
      name: 'Alice',
      role: 'employee',
      department: 'IT',
    });
  });

  it('Blocks double check-in when an "เข้างาน" record already exists for today', async () => {
    const { getThaiDateStr } = await import('@/lib/timeSync');
    const today = getThaiDateStr();

    // Mock existing checkin log for today
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
        return { data: [] }; // No previous logs
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

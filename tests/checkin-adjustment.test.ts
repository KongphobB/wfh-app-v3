import { describe, it, expect } from 'vitest';
import { applyCheckinAdjustments, getAllCheckinAdjustments } from '@/lib/checkinAdjustmentStore';

describe('Checkin Adjustment Store Test Suite', () => {
  it('1. Loads configured adjustments from disk', () => {
    const adjustments = getAllCheckinAdjustments();
    expect(adjustments.length).toBeGreaterThan(0);
    const adj1304 = adjustments.find((a) => a.employee_id === '1304' && a.date === '2026-10-09');
    expect(adj1304).toBeDefined();
    expect(adj1304?.time).toBe('07:50:51');
    expect(adj1304?.verification_status).toBe('ตรงเวลา');
    expect(adj1304?.remove_duplicate_employee_id).toBe('9999');
  });

  it('2. Corrects 1304 checkin time to 07:50:51 and removes accidental 9999 checkin', () => {
    const mockLogs = [
      {
        uuid: 'LOG-641ba56e-b470-467e-aa90-2a6db0193434',
        employeeId: '1304',
        name: 'ก้องภพ บุญชู',
        type: 'เข้างาน',
        date: '2026-10-09',
        time: '09:15:32',
        log_time: '2026-10-09T09:15:32+07:00',
        note: 'ลืม',
        verificationStatus: 'เข้างานสาย',
      },
      {
        uuid: 'LOG-f739a04b-0e37-422a-84a1-ec6df8578049',
        employeeId: '9999',
        name: 'ก้องภพ',
        type: 'เข้างาน',
        date: '2026-10-09',
        time: '07:50:51',
        log_time: '2026-10-09T07:50:51+07:00',
        note: '',
        verificationStatus: 'รอการยืนยันตัวตนรอบ 2',
      },
      {
        uuid: 'LOG-other',
        employeeId: '1313',
        name: 'เกษิเดช',
        type: 'เข้างาน',
        date: '2026-10-09',
        time: '08:00:00',
        log_time: '2026-10-09T08:00:00+07:00',
        note: '',
        verificationStatus: 'ตรงเวลา',
      },
    ];

    const adjusted = applyCheckinAdjustments(mockLogs);

    // 9999 must be removed
    expect(adjusted.some((l) => l.employeeId === '9999')).toBe(false);

    // 1304 must have corrected time and on-time status
    const emp1304 = adjusted.find((l) => l.employeeId === '1304');
    expect(emp1304).toBeDefined();
    expect(emp1304?.time).toBe('07:50:51');
    expect(emp1304?.log_time).toBe('2026-10-09T07:50:51+07:00');
    expect(emp1304?.verificationStatus).toBe('ตรงเวลา');
    expect(emp1304?.note).toBe('');

    // 1313 must remain untouched
    const emp1313 = adjusted.find((l) => l.employeeId === '1313');
    expect(emp1313?.time).toBe('08:00:00');
    expect(emp1313?.verificationStatus).toBe('ตรงเวลา');
  });
});

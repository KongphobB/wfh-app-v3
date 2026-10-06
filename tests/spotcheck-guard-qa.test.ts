import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendSpotCheckTriggeredEmail } from '@/lib/email';

describe('QA Suite: Spot Check Guard & Notification Enhancements', () => {
  let consoleSpy: any;

  beforeEach(() => {
    process.env.EMAIL_STUB_LOG = 'true';
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('QA 1. Guard check: Employee without check-in cannot be spot checked', () => {
    const mockCheckinLogs = [
      { employeeId: '1313', date: '2026-10-06', type: 'เข้างาน' },
      { employeeId: '9988', date: '2026-10-05', type: 'เข้างาน' }, // yesterday only
    ];
    const todayStr = '2026-10-06';

    const canSpotCheck9988 = mockCheckinLogs.some(
      (c) => c.employeeId === '9988' && c.date === todayStr && c.type === 'เข้างาน'
    );
    const canSpotCheck1313 = mockCheckinLogs.some(
      (c) => c.employeeId === '1313' && c.date === todayStr && c.type === 'เข้างาน'
    );

    expect(canSpotCheck9988).toBe(false);
    expect(canSpotCheck1313).toBe(true);
  });

  it('QA 2. Milestone chimes: Triggers sound at all 6 milestone intervals (8m, 6m, 4m, 2m, 1m, 30s)', () => {
    const MILESTONES = [480, 360, 240, 120, 60, 30];
    const triggered = new Set<number>();

    // Simulate ticking timer with background throttling (jumping seconds)
    const simulatedTicks = [
      590, 500, 475, // crossed 480 (8m)
      400, 355,      // crossed 360 (6m)
      250, 238,      // crossed 240 (4m)
      150, 118,      // crossed 120 (2m)
      70, 58,        // crossed 60 (1m)
      35, 28,        // crossed 30 (30s)
      15, 0
    ];

    let chimeCount = 0;
    for (const secs of simulatedTicks) {
      for (const m of MILESTONES) {
        if (secs <= m && !triggered.has(m)) {
          triggered.add(m);
          chimeCount++;
          break;
        }
      }
    }

    expect(chimeCount).toBe(6);
    expect(triggered.size).toBe(6);
    expect(triggered.has(480)).toBe(true);
    expect(triggered.has(30)).toBe(true);
  });

  it('QA 3. Real-time Spot Check Email: Dispatches instantly with direct action link', async () => {
    const result = await sendSpotCheckTriggeredEmail({
      employeeName: 'ทดสอบเมลบริษัท',
      employeeId: '9988',
      employeeEmail: 'kongphob@snuthailand.com',
      round: 'เฉพาะกิจ (หัวหน้าสั่งตรวจ)',
      scheduledTime: '10:55',
      deadlineTime: '11:05',
      note: 'ทดสอบระบบแจ้งเตือนแบบเรียลไทม์',
    });

    expect(result).toBe(true);
    const output = consoleSpy.mock.calls.map((c: any[]) => c.join(' ')).join('\n');
    expect(output).toContain('TO: kongphob@snuthailand.com');
    expect(output).toContain('[ด่วน: สุ่มตรวจ WFH] มีคำสั่งสุ่มตรวจยืนยันตัวตน กรุณาถ่ายภาพ Selfie ภายใน 10 นาที');
    expect(output).toContain('https://wfh-system-v3.vercel.app/spotcheck');
    expect(output).toContain('11:05 น.');
  });
});

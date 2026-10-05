import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendEmailAlert,
  sendLateCheckinNotificationEmail,
  sendMissingCheckinAlertEmail,
  sendAbsentAlertEmail,
  sendMissedSpotCheckAlertEmail,
} from '@/lib/email';

describe('Late, Missing, Absent & Spot Check Supervisor Email Notification Suite', () => {
  let consoleSpy: any;

  beforeEach(() => {
    process.env.EMAIL_STUB_LOG = 'true';
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('1. sendLateCheckinNotificationEmail sends to BOTH supervisor and admin', async () => {
    await sendLateCheckinNotificationEmail({
      employeeName: 'ก้องภพ บุญชู',
      employeeId: '1304',
      department: 'Project',
      position: 'พนักงาน',
      checkinTime: '08:45',
      reason: 'การจราจรติดขัด ฝนตกหนัก',
      supervisorEmail: 'supervisor@company.com',
      adminEmail: 'admin@company.com',
      employeeEmail: 'employee@company.com',
    });

    const calls = consoleSpy.mock.calls.map((c: any[]) => c.join(' ')).join('\n');
    expect(calls).toContain('TO: supervisor@company.com, admin@company.com');
    expect(calls).toContain('CC: employee@company.com');
    expect(calls).toContain('[แจ้งเตือนเข้างานสาย] พนักงาน ก้องภพ บุญชู (1304) ลงเวลา 08:45 น.');
    expect(calls).toContain('การจราจรติดขัด ฝนตกหนัก');
  });

  it('2. sendMissingCheckinAlertEmail sends to BOTH supervisor and admin (and CCs employee)', async () => {
    await sendMissingCheckinAlertEmail({
      employeeName: 'นายกษิดิ์เดช ปิ่นทองพันธ์',
      employeeId: '1313',
      department: 'Project',
      supervisorEmail: 'head_supervisor@company.com',
      adminEmail: 'main_admin@company.com',
      employeeEmail: 'kasidet@company.com',
    });

    const calls = consoleSpy.mock.calls.map((c: any[]) => c.join(' ')).join('\n');
    expect(calls).toContain('TO: head_supervisor@company.com, main_admin@company.com');
    expect(calls).toContain('CC: kasidet@company.com');
    expect(calls).toContain('[แจ้งเตือนด่วน] พนักงานยังไม่ได้ลงเวลาเข้างาน (หลัง 08:00 น.) - นายกษิดิ์เดช ปิ่นทองพันธ์ (1313)');
  });

  it('3. sendAbsentAlertEmail sends absent notification past 12:00 PM to supervisor and admin', async () => {
    await sendAbsentAlertEmail({
      employeeName: 'สมชาย ทดสอบ',
      employeeId: '1201',
      department: 'IT',
      supervisorEmail: 'supervisor@company.com',
      adminEmail: 'admin@company.com',
      employeeEmail: 'somchai@company.com',
    });

    const calls = consoleSpy.mock.calls.map((c: any[]) => c.join(' ')).join('\n');
    expect(calls).toContain('TO: supervisor@company.com, admin@company.com');
    expect(calls).toContain('CC: somchai@company.com');
    expect(calls).toContain('[แจ้งเตือนด่วน: ขาดงาน] พนักงาน สมชาย ทดสอบ (1201) ยังไม่ลงเวลาเข้างาน (เกินเวลา 12:00 น.)');
    expect(calls).toContain('สถานะ: ขาดงานช่วงเช้า / ขาดการติดต่อ');
  });

  it('4. sendMissedSpotCheckAlertEmail sends 10-minute timeout alert to supervisor and admin', async () => {
    await sendMissedSpotCheckAlertEmail({
      employeeName: 'สมหญิง ขยัน',
      employeeId: '1202',
      department: 'Marketing',
      round: 'เช้า',
      scheduledTime: '10:30',
      supervisorEmail: 'supervisor@company.com',
      adminEmail: 'admin@company.com',
      employeeEmail: 'somying@company.com',
    });

    const calls = consoleSpy.mock.calls.map((c: any[]) => c.join(' ')).join('\n');
    expect(calls).toContain('TO: supervisor@company.com, admin@company.com');
    expect(calls).toContain('CC: somying@company.com');
    expect(calls).toContain('[แจ้งเตือนด่วน: พลาดการสุ่มตรวจ] พนักงาน สมหญิง ขยัน (1202) ไม่ยืนยันตัวตนใน 10 นาที (รอบ เช้า)');
    expect(calls).toContain('ไม่ผ่าน (ขาดการติดต่อเกิน 10 นาที)');
  });

  it('5. Deduplicates recipients if admin and supervisor share the same email address', async () => {
    await sendLateCheckinNotificationEmail({
      employeeName: 'ทดสอบ',
      employeeId: '9901',
      checkinTime: '09:00',
      reason: 'สาย',
      supervisorEmail: 'same_email@company.com',
      adminEmail: 'same_email@company.com',
    });

    const calls = consoleSpy.mock.calls.map((c: any[]) => c.join(' ')).join('\n');
    expect(calls).toContain('TO: same_email@company.com');
    expect(calls).not.toContain('TO: same_email@company.com, same_email@company.com');
  });
});

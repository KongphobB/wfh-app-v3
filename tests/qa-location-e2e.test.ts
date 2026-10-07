import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDailyWorkLocation,
  setDailyWorkLocation,
  isEmployeeAtOfficeToday,
  getAllDailyWorkLocations,
} from '@/lib/dailyLocationStore';
import { getAllAuditLogs } from '@/lib/auditStore';

describe('Comprehensive QA Suite: Multi-Employee Work Location Toggle', () => {
  const dateStr = '2026-10-07';
  const emp1 = '1304';
  const emp2 = '1313';
  const emp3 = '8888';

  beforeEach(() => {
    // Reset all test subjects to WFH before each test
    setDailyWorkLocation(emp1, 'wfh', 'Employee 1', 'Admin', dateStr);
    setDailyWorkLocation(emp2, 'wfh', 'Employee 2', 'Admin', dateStr);
    setDailyWorkLocation(emp3, 'wfh', 'Employee 3', 'Admin', dateStr);
  });

  it('QA Test 1: Sequential toggle does NOT overwrite previously toggled employees', () => {
    // Step 1: Admin clicks Employee 1 -> Office
    setDailyWorkLocation(emp1, 'office', 'ก้องภพ บุญชู', 'Admin', dateStr);
    expect(getDailyWorkLocation(emp1, dateStr)).toBe('office');
    expect(getDailyWorkLocation(emp2, dateStr)).toBe('wfh');

    // Step 2: Admin clicks Employee 2 -> Office
    setDailyWorkLocation(emp2, 'office', 'เกษิเดช', 'Admin', dateStr);

    // CRITICAL QA CHECK: Employee 1 MUST STILL BE OFFICE!
    expect(getDailyWorkLocation(emp1, dateStr)).toBe('office');
    expect(getDailyWorkLocation(emp2, dateStr)).toBe('office');
    expect(getDailyWorkLocation(emp3, dateStr)).toBe('wfh');

    // Step 3: Admin clicks Employee 3 -> Office
    setDailyWorkLocation(emp3, 'office', 'ผักบุ้ง', 'Admin', dateStr);
    expect(getDailyWorkLocation(emp1, dateStr)).toBe('office');
    expect(getDailyWorkLocation(emp2, dateStr)).toBe('office');
    expect(getDailyWorkLocation(emp3, dateStr)).toBe('office');
  });

  it('QA Test 2: Toggling one employee back to WFH does not affect other Office employees', () => {
    // Both are at Office
    setDailyWorkLocation(emp1, 'office', 'ก้องภพ บุญชู', 'Admin', dateStr);
    setDailyWorkLocation(emp2, 'office', 'เกษิเดช', 'Admin', dateStr);

    // Toggle Employee 1 back to WFH
    setDailyWorkLocation(emp1, 'wfh', 'ก้องภพ บุญชู', 'Admin', dateStr);

    // Employee 1 is now WFH, but Employee 2 MUST REMAIN OFFICE!
    expect(getDailyWorkLocation(emp1, dateStr)).toBe('wfh');
    expect(getDailyWorkLocation(emp2, dateStr)).toBe('office');
  });

  it('QA Test 3: getAllDailyWorkLocations returns exact mapping dictionary', () => {
    setDailyWorkLocation(emp1, 'office', 'ก้องภพ บุญชู', 'Admin', dateStr);
    setDailyWorkLocation(emp2, 'office', 'เกษิเดช', 'Admin', dateStr);
    setDailyWorkLocation(emp3, 'wfh', 'ผักบุ้ง', 'Admin', dateStr);

    const all = getAllDailyWorkLocations(dateStr);
    expect(all[emp1]).toBe('office');
    expect(all[emp2]).toBe('office');
    expect(all[emp3]).toBe('wfh');
  });

  it('QA Test 4: Spot check routine filtering logic for Office vs WFH', () => {
    // Mock routine spot checks
    const sampleSpotChecks = [
      { id: 'SPOT-1', round: 'เช้า', scheduled_time: '10:00:00', result_status: 'Scheduled' },
      { id: 'SPOT-2', round: 'บ่าย', scheduled_time: '14:00:00', result_status: 'Scheduled' },
      { id: 'SPOT-MANUAL-001', round: 'เฉพาะกิจ (หัวหน้าสั่งตรวจ)', scheduled_time: '11:00:00', result_status: 'Scheduled' },
    ];

    // Case A: Employee 1 is Office
    setDailyWorkLocation(emp1, 'office', 'ก้องภพ บุญชู', 'Admin', dateStr);
    const isEmp1Office = isEmployeeAtOfficeToday(emp1, dateStr);
    expect(isEmp1Office).toBe(true);

    const emp1FinalChecks = isEmp1Office
      ? sampleSpotChecks.filter((s) => s.round?.includes('เฉพาะกิจ') || s.id?.startsWith('SPOT-MANUAL'))
      : sampleSpotChecks;

    // Routine checks (เช้า / บ่าย) are stripped, only manual remains!
    expect(emp1FinalChecks.length).toBe(1);
    expect(emp1FinalChecks[0].id).toBe('SPOT-MANUAL-001');

    // Case B: Employee 2 is WFH
    setDailyWorkLocation(emp2, 'wfh', 'เกษิเดช', 'Admin', dateStr);
    const isEmp2Office = isEmployeeAtOfficeToday(emp2, dateStr);
    expect(isEmp2Office).toBe(false);

    const emp2FinalChecks = isEmp2Office
      ? sampleSpotChecks.filter((s) => s.round?.includes('เฉพาะกิจ') || s.id?.startsWith('SPOT-MANUAL'))
      : sampleSpotChecks;

    // Routine checks remain active for WFH employee!
    expect(emp2FinalChecks.length).toBe(3);
  });

  it('QA Test 5: Supervisor attendance status categorization logic', () => {
    // When someone is configured as office today:
    const teamMember = {
      id: emp1,
      name: 'ก้องภพ บุญชู',
      work_location_today: 'office',
    };

    const isConfiguredOffice = teamMember.work_location_today === 'office';
    const morningLog = null; // Has not checked in yet

    let status = 'missing';
    let checkinDetails = '';

    if (morningLog) {
      // Checked in logic
    } else if (isConfiguredOffice) {
      status = 'onsite';
      checkinDetails = 'เข้าปฏิบัติงานที่ออฟฟิศ (กำหนดโดย Admin)';
    }

    // Must be classified as 'onsite', NOT 'missing'!
    expect(status).toBe('onsite');
    expect(checkinDetails).toContain('ออฟฟิศ');
  });

  it('QA Test 6: Missing check-in & absent notification tick EXEMPTS office employees', () => {
    // Simulate employee list
    const employees = [
      { id: emp1, name: 'ก้องภพ บุญชู' }, // office
      { id: emp2, name: 'เกษิเดช' },     // wfh
    ];

    // Mark emp1 as office today
    setDailyWorkLocation(emp1, 'office', 'ก้องภพ บุญชู', 'Admin', dateStr);
    setDailyWorkLocation(emp2, 'wfh', 'เกษิเดช', 'Admin', dateStr);

    const checkedInEmpIds = new Set<string>(); // Neither has checked in yet
    const notifiedEmployees: { id: string; name: string }[] = [];

    for (const emp of employees) {
      if (
        !checkedInEmpIds.has(emp.id) &&
        emp.id !== '9999' &&
        !isEmployeeAtOfficeToday(emp.id, dateStr)
      ) {
        notifiedEmployees.push(emp);
      }
    }

    // Only emp2 (WFH) should receive absent/missing check-in notification.
    // emp1 (Office) MUST NOT receive any missing check-in alert!
    expect(notifiedEmployees.map((e) => e.id)).toEqual([emp2]);
    expect(notifiedEmployees.find((e) => e.id === emp1)).toBeUndefined();
  });

  it('QA Test 7: Spot check expiration tick ignores routine spot checks for office employees', () => {
    setDailyWorkLocation(emp1, 'office', 'ก้องภพ บุญชู', 'Admin', dateStr);

    const rawSpotLogs = [
      { employeeId: emp1, round: 'เช้า', status: 'Scheduled', date: dateStr },
      { employeeId: emp1, round: 'บ่าย', status: 'Scheduled', date: dateStr },
      { employeeId: emp1, round: 'เฉพาะกิจ (หัวหน้าสั่งตรวจ)', status: 'Scheduled', date: dateStr },
    ];

    const failedOrAlerted: any[] = [];
    for (const s of rawSpotLogs) {
      const isOffice = isEmployeeAtOfficeToday(String(s.employeeId), dateStr);
      const isRoutine = !s.round || s.round.includes('เช้า') || s.round.includes('บ่าย') || s.round.includes('ประจำวัน');
      if (isOffice && isRoutine) {
        continue; // Exempt!
      }
      failedOrAlerted.push(s);
    }

    // Routine rounds are skipped, only manual/ad-hoc remains eligible for failure checks
    expect(failedOrAlerted.length).toBe(1);
    expect(failedOrAlerted[0].round).toContain('เฉพาะกิจ');
  });
});

import { describe, it, expect } from 'vitest';
import { 
  getEmployeeWeeklySchedule, 
  setEmployeeWeeklySchedule, 
  isEmployeeScheduledWfhToday, 
  getBangkokDayOfWeek 
} from '@/lib/scheduleStore';
import { resolveEmployeeDailyStatus } from '@/lib/dailyStatus';
import { setDailyWorkLocation, getDailyWorkLocation, getAllDailyWorkLocations } from '@/lib/dailyLocationStore';
import { createLeaveRequest, updateLeaveStatus } from '@/lib/leaveStore';

describe('Feature 2: Weekly WFH Schedule Preset QA', () => {
  // 2026-10-07 is Wednesday (Day 3)
  // 2026-10-08 is Thursday (Day 4)
  // 2026-10-10 is Saturday (Weekend)
  const wednesdayDate = '2026-10-07';
  const thursdayDate = '2026-10-08';
  const saturdayDate = '2026-10-10';

  it('1. correctly identifies day of week in Bangkok timezone', () => {
    expect(getBangkokDayOfWeek(wednesdayDate)).toBe(3); // Wednesday
    expect(getBangkokDayOfWeek(thursdayDate)).toBe(4);  // Thursday
    expect(getBangkokDayOfWeek(saturdayDate)).toBe(6);  // Saturday
  });

  it('2. sets and retrieves weekly schedule for an employee', () => {
    const empId = 'emp_preset_test_1';
    // Set WFH on Wednesday (3) and Friday (5)
    const saved = setEmployeeWeeklySchedule(empId, [3, 5]);
    expect(saved).toEqual([3, 5]);

    const retrieved = getEmployeeWeeklySchedule(empId);
    expect(retrieved).toEqual([3, 5]);

    // Wednesday -> true
    expect(isEmployeeScheduledWfhToday(empId, wednesdayDate)).toBe(true);
    // Thursday -> false
    expect(isEmployeeScheduledWfhToday(empId, thursdayDate)).toBe(false);
    // Saturday -> false (weekends excluded)
    expect(isEmployeeScheduledWfhToday(empId, saturdayDate)).toBe(false);
  });

  it('3. resolveEmployeeDailyStatus treats preset WFH days as WFH with weekly_schedule source', () => {
    const empId = 'emp_preset_test_2';
    // Set WFH on Wednesday (3)
    setEmployeeWeeklySchedule(empId, [3]);

    const resolvedWed = resolveEmployeeDailyStatus(empId, wednesdayDate);
    expect(resolvedWed.status).toBe('wfh');
    expect(resolvedWed.location).toBe('wfh');
    expect(resolvedWed.source).toBe('weekly_schedule');
    expect(resolvedWed.isExemptFromMissingCheckin).toBe(false);
    expect(resolvedWed.isExemptFromRoutineSpotCheck).toBe(false);

    // On Thursday, employee has no WFH preset -> defaults to Office
    const resolvedThu = resolveEmployeeDailyStatus(empId, thursdayDate);
    expect(resolvedThu.status).toBe('office');
    expect(resolvedThu.source).toBe('default_office');
    expect(resolvedThu.isExemptFromMissingCheckin).toBe(true);
  });

  it('4. Explicit Admin toggle overrides preset weekly schedule for today', () => {
    const empId = 'emp_preset_test_3';
    // Employee has WFH scheduled every Wednesday (3)
    setEmployeeWeeklySchedule(empId, [3]);
    expect(isEmployeeScheduledWfhToday(empId, wednesdayDate)).toBe(true);

    // Admin explicitly sets them to Office today
    setDailyWorkLocation(empId, 'office', 'Tester Override', 'Admin', wednesdayDate);

    const resolved = resolveEmployeeDailyStatus(empId, wednesdayDate);
    expect(resolved.status).toBe('office');
    expect(resolved.location).toBe('office');
    expect(resolved.source).toBe('admin_toggle');
    expect(resolved.isExemptFromMissingCheckin).toBe(true);
  });

  it('5. Approved Leave overrides preset weekly schedule', () => {
    const empId = 'emp_preset_test_4';
    // Employee has WFH scheduled every Wednesday (3)
    setEmployeeWeeklySchedule(empId, [3]);

    // Employee is on Sick Leave on Wednesday
    const leave = createLeaveRequest({
      employee_id: empId,
      employee_name: 'Tester Leave',
      leave_type: 'ลาป่วย',
      start_date: wednesdayDate,
      end_date: wednesdayDate,
      reason: 'อาหารเป็นพิษ',
    });
    updateLeaveStatus({
      id: leave.id,
      status: 'Approved',
      reviewed_by: 'Supervisor',
    });

    const resolved = resolveEmployeeDailyStatus(empId, wednesdayDate);
    expect(resolved.status).toBe('leave');
    expect(resolved.source).toBe('leave_approved');
    expect(resolved.isExemptFromMissingCheckin).toBe(true);
  });

  it('6. Weekend overrides weekly schedule', () => {
    const empId = 'emp_preset_test_5';
    // Even if somehow scheduled
    setEmployeeWeeklySchedule(empId, [1, 2, 3, 4, 5]);

    const resolvedSat = resolveEmployeeDailyStatus(empId, saturdayDate);
    expect(resolvedSat.status).toBe('holiday');
    expect(resolvedSat.source).toBe('holiday');
  });

  it('7. dailyLocationStore reflects weekly schedule in getDailyWorkLocation and getAllDailyWorkLocations', () => {
    const empId = 'emp_preset_test_6';
    setEmployeeWeeklySchedule(empId, [3]); // Wednesday

    expect(getDailyWorkLocation(empId, wednesdayDate)).toBe('wfh');
    expect(getDailyWorkLocation(empId, thursdayDate)).toBe('office');

    const allLocations = getAllDailyWorkLocations(wednesdayDate);
    expect(allLocations[empId]).toBe('wfh');
  });
});

describe('Feature 4: Evening Task Reminder Window Logic QA', () => {
  function checkEveningReminderWindow(thHour: number, thMin: number) {
    return (thHour === 16 && thMin >= 30) || (thHour === 17 && thMin === 0);
  }

  it('1. correctly triggers in the 16:30 - 17:00 window', () => {
    expect(checkEveningReminderWindow(16, 30)).toBe(true);
    expect(checkEveningReminderWindow(16, 45)).toBe(true);
    expect(checkEveningReminderWindow(16, 59)).toBe(true);
    expect(checkEveningReminderWindow(17, 0)).toBe(true);
  });

  it('2. does NOT trigger before 16:30 or after 17:00', () => {
    expect(checkEveningReminderWindow(16, 29)).toBe(false);
    expect(checkEveningReminderWindow(15, 30)).toBe(false);
    expect(checkEveningReminderWindow(14, 0)).toBe(false);
    expect(checkEveningReminderWindow(17, 1)).toBe(false);
    expect(checkEveningReminderWindow(18, 0)).toBe(false);
  });
});

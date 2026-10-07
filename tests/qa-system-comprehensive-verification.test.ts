import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getEmployeeWeeklySchedule, 
  setEmployeeWeeklySchedule, 
  isEmployeeScheduledWfhToday,
  getBangkokDayOfWeek 
} from '@/lib/scheduleStore';
import { resolveEmployeeDailyStatus } from '@/lib/dailyStatus';
import { 
  getDailyWorkLocation, 
  setDailyWorkLocation, 
  getAllDailyWorkLocations,
  getDailyLocationRecord 
} from '@/lib/dailyLocationStore';
import { createLeaveRequest, updateLeaveStatus } from '@/lib/leaveStore';

describe('Comprehensive QA: New Features & System Integration', () => {
  // Setup known test dates
  // 2026-10-05 = Monday (1)
  // 2026-10-06 = Tuesday (2)
  // 2026-10-07 = Wednesday (3)
  // 2026-10-08 = Thursday (4)
  // 2026-10-09 = Friday (5)
  // 2026-10-10 = Saturday (6)
  const monday = '2026-10-05';
  const tuesday = '2026-10-06';
  const wednesday = '2026-10-07';
  const thursday = '2026-10-08';
  const friday = '2026-10-09';
  const saturday = '2026-10-10';

  describe('1. Weekly WFH Schedule Preset - Core Logic & Data Persistence', () => {
    it('1.1 should correctly persist multiple employees schedules without data interference', () => {
      const empA = 'emp_qa_comp_A';
      const empB = 'emp_qa_comp_B';
      const empC = 'emp_qa_comp_C';

      // Emp A: Tue & Thu
      setEmployeeWeeklySchedule(empA, [2, 4]);
      // Emp B: Mon, Wed, Fri
      setEmployeeWeeklySchedule(empB, [1, 3, 5]);
      // Emp C: No schedule (Office every day)
      setEmployeeWeeklySchedule(empC, []);

      expect(getEmployeeWeeklySchedule(empA)).toEqual([2, 4]);
      expect(getEmployeeWeeklySchedule(empB)).toEqual([1, 3, 5]);
      expect(getEmployeeWeeklySchedule(empC)).toEqual([]);

      // Verify on Tuesday:
      expect(isEmployeeScheduledWfhToday(empA, tuesday)).toBe(true);
      expect(isEmployeeScheduledWfhToday(empB, tuesday)).toBe(false);
      expect(isEmployeeScheduledWfhToday(empC, tuesday)).toBe(false);

      // Verify on Wednesday:
      expect(isEmployeeScheduledWfhToday(empA, wednesday)).toBe(false);
      expect(isEmployeeScheduledWfhToday(empB, wednesday)).toBe(true);
      expect(isEmployeeScheduledWfhToday(empC, wednesday)).toBe(false);
    });

    it('1.2 should sanitize invalid days (e.g. weekends or out of range)', () => {
      const emp = 'emp_qa_comp_sanitize';
      // Pass invalid day numbers like 0, 6, 7, -1
      const result = setEmployeeWeeklySchedule(emp, [0, 1, 3, 6, 7, -1, 3]);
      // Should filter to [1, 3] and remove duplicates
      expect(result).toEqual([1, 3]);
      expect(getEmployeeWeeklySchedule(emp)).toEqual([1, 3]);
    });
  });

  describe('2. Resolution Priority Hierarchy QA', () => {
    it('2.1 Weekly WFH day is resolved as WFH when no override exists', () => {
      const testEmp = 'emp_qa_hierarchy_2_1';
      // Set WFH on Wednesday
      setEmployeeWeeklySchedule(testEmp, [3]);

      const resWed = resolveEmployeeDailyStatus(testEmp, wednesday);
      expect(resWed.status).toBe('wfh');
      expect(resWed.location).toBe('wfh');
      expect(resWed.source).toBe('weekly_schedule');
      expect(resWed.isExemptFromMissingCheckin).toBe(false);
      expect(resWed.isExemptFromRoutineSpotCheck).toBe(false);
    });

    it('2.2 Non-scheduled day defaults to Office (facial scan, exempt from WFH rules)', () => {
      const testEmp = 'emp_qa_hierarchy_2_2';
      setEmployeeWeeklySchedule(testEmp, [3]); // Only Wed

      const resThu = resolveEmployeeDailyStatus(testEmp, thursday);
      expect(resThu.status).toBe('office');
      expect(resThu.location).toBe('office');
      expect(resThu.source).toBe('default_office');
      expect(resThu.isExemptFromMissingCheckin).toBe(true);
      expect(resThu.isExemptFromRoutineSpotCheck).toBe(true);
    });

    it('2.3 Admin Toggle for today strictly overrides weekly schedule (Set Office)', () => {
      const testEmp = 'emp_qa_hierarchy_2_3';
      // Employee has preset WFH on Wednesday
      setEmployeeWeeklySchedule(testEmp, [3]);
      // Admin calls them into Office on Wednesday
      setDailyWorkLocation(testEmp, 'office', 'Tester Hierarchy', 'Admin Supervisor', wednesday, {
        reason: 'มีประชุมด่วนที่สำนักงานใหญ่',
      });

      const res = resolveEmployeeDailyStatus(testEmp, wednesday);
      expect(res.status).toBe('office');
      expect(res.location).toBe('office');
      expect(res.source).toBe('admin_toggle');
      expect(res.isExemptFromMissingCheckin).toBe(true);
    });

    it('2.4 Admin Toggle for today strictly overrides weekly schedule (Set WFH on non-preset day)', () => {
      const testEmp = 'emp_qa_hierarchy_2_4';
      // Employee only scheduled on Wednesday, today is Thursday
      setEmployeeWeeklySchedule(testEmp, [3]);
      // Admin allows WFH on Thursday
      setDailyWorkLocation(testEmp, 'wfh', 'Tester Hierarchy', 'Admin Supervisor', thursday, {
        reason: 'หัวหน้าอนุมัติให้ WFH เป็นกรณีพิเศษ',
      });

      const res = resolveEmployeeDailyStatus(testEmp, thursday);
      expect(res.status).toBe('wfh');
      expect(res.location).toBe('wfh');
      expect(res.source).toBe('admin_toggle');
      expect(res.isExemptFromMissingCheckin).toBe(false);
    });

    it('2.5 GPS Auto-switch to Office overrides preset weekly schedule', () => {
      const gpsEmp = 'emp_qa_gps_override';
      setEmployeeWeeklySchedule(gpsEmp, [3]); // Scheduled WFH on Wednesday

      // Employee arrived at office GPS area
      setDailyWorkLocation(gpsEmp, 'office', 'GPS Worker', 'GPS System', wednesday, {
        reason: 'ระบบตรวจจับพิกัด GPS อัตโนมัติ: อยู่ในพื้นที่บริษัท',
        is_auto_gps: true,
      });

      const res = resolveEmployeeDailyStatus(gpsEmp, wednesday);
      expect(res.status).toBe('office');
      expect(res.location).toBe('office');
      expect(res.source).toBe('gps_auto');
      expect(res.isExemptFromMissingCheckin).toBe(true);
    });

    it('2.6 Approved Absence Leave overrides preset weekly schedule', () => {
      const leaveEmp = 'emp_qa_leave_override';
      setEmployeeWeeklySchedule(leaveEmp, [3]); // Scheduled WFH on Wednesday

      // Approved vacation leave
      const leave = createLeaveRequest({
        employee_id: leaveEmp,
        employee_name: 'Vacation Worker',
        leave_type: 'ลาพักร้อน',
        start_date: wednesday,
        end_date: wednesday,
        reason: 'พักผ่อนประจำปี',
      });
      updateLeaveStatus({
        id: leave.id,
        status: 'Approved',
        reviewed_by: 'Supervisor',
      });

      const res = resolveEmployeeDailyStatus(leaveEmp, wednesday);
      expect(res.status).toBe('leave');
      expect(res.source).toBe('leave_approved');
      expect(res.isExemptFromMissingCheckin).toBe(true);
      expect(res.isExemptFromRoutineSpotCheck).toBe(true);
    });

    it('2.7 Weekend / Holiday strictly overrides weekly schedule', () => {
      const holEmp = 'emp_qa_hol_override';
      setEmployeeWeeklySchedule(holEmp, [1, 2, 3, 4, 5]);

      const resWeekend = resolveEmployeeDailyStatus(holEmp, saturday);
      expect(resWeekend.status).toBe('holiday');
      expect(resWeekend.source).toBe('holiday');
      expect(resWeekend.isExemptFromMissingCheckin).toBe(true);
    });
  });

  describe('3. Evening Task Reminder Logic & Edge Cases QA', () => {
    // Helper function reproducing dashboard time logic
    function evaluateEveningWindows(hour: number, minute: number) {
      return {
        isLunchBreak: hour === 12,
        isAfternoonVerifyWindow: hour === 13 && minute >= 0 && minute <= 20,
        isLateAfternoonVerifyWindow: (hour === 13 && minute > 20) || (hour >= 14 && hour < 18),
        isMorningMissingCheckin: (hour > 8 || (hour === 8 && minute > 0)) && hour < 18,
        isEveningCheckoutWindow: hour >= 17,
        isEveningTaskReminderWindow: (hour === 16 && minute >= 30) || (hour === 17 && minute === 0),
      };
    }

    function shouldShowEveningTaskReminder(params: {
      isCheckedInWfhToday: boolean;
      hasSubmittedTask: boolean;
      hasCheckedOut: boolean;
      isEveningTaskReminderWindow: boolean;
    }) {
      return (
        params.isCheckedInWfhToday &&
        !params.hasSubmittedTask &&
        !params.hasCheckedOut &&
        params.isEveningTaskReminderWindow
      );
    }

    it('3.1 should trigger reminder banner during 16:30 - 17:00 when conditions are met', () => {
      const times = [
        { h: 16, m: 30, expected: true },
        { h: 16, m: 40, expected: true },
        { h: 16, m: 50, expected: true },
        { h: 16, m: 59, expected: true },
        { h: 17, m: 0,  expected: true },
      ];

      for (const t of times) {
        const windows = evaluateEveningWindows(t.h, t.m);
        expect(windows.isEveningTaskReminderWindow).toBe(t.expected);

        const bannerShown = shouldShowEveningTaskReminder({
          isCheckedInWfhToday: true,
          hasSubmittedTask: false,
          hasCheckedOut: false,
          isEveningTaskReminderWindow: windows.isEveningTaskReminderWindow,
        });
        expect(bannerShown).toBe(true);
      }
    });

    it('3.2 should NOT trigger reminder banner outside 16:30 - 17:00', () => {
      const outsideTimes = [
        { h: 9, m: 0 },
        { h: 12, m: 30 },
        { h: 15, m: 0 },
        { h: 16, m: 29 }, // 1 min before window
        { h: 17, m: 1 },  // 1 min after window (evening checkout banner active)
        { h: 18, m: 0 },
      ];

      for (const t of outsideTimes) {
        const windows = evaluateEveningWindows(t.h, t.m);
        expect(windows.isEveningTaskReminderWindow).toBe(false);

        const bannerShown = shouldShowEveningTaskReminder({
          isCheckedInWfhToday: true,
          hasSubmittedTask: false,
          hasCheckedOut: false,
          isEveningTaskReminderWindow: windows.isEveningTaskReminderWindow,
        });
        expect(bannerShown).toBe(false);
      }
    });

    it('3.3 should NOT show reminder if employee has already submitted their daily task', () => {
      const windows = evaluateEveningWindows(16, 45);
      const bannerShown = shouldShowEveningTaskReminder({
        isCheckedInWfhToday: true,
        hasSubmittedTask: true, // ALREADY SUBMITTED
        hasCheckedOut: false,
        isEveningTaskReminderWindow: windows.isEveningTaskReminderWindow,
      });
      expect(bannerShown).toBe(false);
    });

    it('3.4 should NOT show reminder if employee has already checked out', () => {
      const windows = evaluateEveningWindows(16, 45);
      const bannerShown = shouldShowEveningTaskReminder({
        isCheckedInWfhToday: true,
        hasSubmittedTask: false,
        hasCheckedOut: true, // ALREADY CHECKED OUT
        isEveningTaskReminderWindow: windows.isEveningTaskReminderWindow,
      });
      expect(bannerShown).toBe(false);
    });

    it('3.5 should NOT show reminder for employees who checked in at Office', () => {
      const windows = evaluateEveningWindows(16, 45);
      const bannerShown = shouldShowEveningTaskReminder({
        isCheckedInWfhToday: false, // NOT WFH
        hasSubmittedTask: false,
        hasCheckedOut: false,
        isEveningTaskReminderWindow: windows.isEveningTaskReminderWindow,
      });
      expect(bannerShown).toBe(false);
    });
  });

  describe('4. Daily Location Store Consistency QA', () => {
    it('4.1 getDailyWorkLocation and getAllDailyWorkLocations return consistent results with weekly schedule', () => {
      const empId = 'emp_qa_store_sync';
      // Scheduled on Monday (1) and Thursday (4)
      setEmployeeWeeklySchedule(empId, [1, 4]);

      // Monday
      expect(getDailyWorkLocation(empId, monday)).toBe('wfh');
      const allMonday = getAllDailyWorkLocations(monday);
      expect(allMonday[empId]).toBe('wfh');

      // Tuesday (Not scheduled)
      expect(getDailyWorkLocation(empId, tuesday)).toBe('office');
      const allTuesday = getAllDailyWorkLocations(tuesday);
      expect(allTuesday[empId]).toBeUndefined(); // or not 'wfh'
    });
  });
});

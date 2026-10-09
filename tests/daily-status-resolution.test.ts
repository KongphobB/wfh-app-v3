import { describe, it, expect, beforeEach } from 'vitest';
import { resolveEmployeeDailyStatus } from '@/lib/dailyStatus';
import { setDailyWorkLocation, getDailyWorkLocation } from '@/lib/dailyLocationStore';
import { createLeaveRequest, updateLeaveStatus, getAllLeaveRequests } from '@/lib/leaveStore';

describe('Daily Status Resolution & Rules QA', () => {
  const todayStr = '2026-10-07';
  const tomorrowStr = '2026-10-08';

  it('1. Default status is Office and is exempt from missing checkin & routine spotcheck', () => {
    const testEmp = 'emp_qa_res_1';
    const status = resolveEmployeeDailyStatus(testEmp, todayStr);
    expect(status.status).toBe('office');
    expect(status.isExemptFromMissingCheckin).toBe(true);
    expect(status.isExemptFromRoutineSpotCheck).toBe(true);
  });

  it('2. Admin/System setting to WFH marks employee as subject to checkin & routine spotchecks', () => {
    const testEmp = 'emp_qa_res_2';
    setDailyWorkLocation(testEmp, 'wfh', 'Tester 2', 'Admin', todayStr);
    const status = resolveEmployeeDailyStatus(testEmp, todayStr);

    expect(status.status).toBe('wfh');
    expect(status.isExemptFromMissingCheckin).toBe(false);
    expect(status.isExemptFromRoutineSpotCheck).toBe(false);
  });

  it('3. Auto-reset next day: Tomorrow without manual WFH setting automatically reverts to Office', () => {
    const testEmp = 'emp_qa_res_3';
    // Today was set to WFH
    setDailyWorkLocation(testEmp, 'wfh', 'Tester 3', 'Admin', todayStr);
    expect(getDailyWorkLocation(testEmp, todayStr)).toBe('wfh');

    // Tomorrow has no record, should automatically be Office
    expect(getDailyWorkLocation(testEmp, tomorrowStr)).toBe('office');
    const tomorrowStatus = resolveEmployeeDailyStatus(testEmp, tomorrowStr);
    expect(tomorrowStatus.status).toBe('office');
    expect(tomorrowStatus.isExemptFromMissingCheckin).toBe(true);
  });

  it('4. Approved Leave takes priority and exempts employee from missing checkin & spotcheck', () => {
    const testEmp = 'emp_qa_res_4';
    const leave = createLeaveRequest({
      employee_id: testEmp,
      employee_name: 'Tester 4',
      leave_type: 'ลาป่วย',
      start_date: todayStr,
      end_date: todayStr,
      reason: 'ไข้หวัดใหญ่',
    });

    updateLeaveStatus({
      id: leave.id,
      status: 'Approved',
      reviewed_by: 'Supervisor One',
      review_note: 'อนุมัติ',
    });

    const status = resolveEmployeeDailyStatus(testEmp, todayStr);
    expect(status.status).toBe('leave');
    expect(status.isExemptFromMissingCheckin).toBe(true);
    expect(status.isExemptFromRoutineSpotCheck).toBe(true);
  });

  it('5. Approved WFH request automatically sets daily location store to WFH', () => {
    const testEmp = 'emp_qa_res_5';
    const wfhLeave = createLeaveRequest({
      employee_id: testEmp,
      employee_name: 'Tester 5',
      leave_type: 'ขอปฏิบัติงานที่บ้าน (WFH)',
      start_date: todayStr,
      end_date: todayStr,
      reason: 'จำเป็นต้องซ่อมท่อน้ำที่บ้าน',
    });

    updateLeaveStatus({
      id: wfhLeave.id,
      status: 'Approved',
      reviewed_by: 'Supervisor One',
      review_note: 'อนุมัติตามคำขอ',
    });

    expect(getDailyWorkLocation(testEmp, todayStr)).toBe('wfh');
    const status = resolveEmployeeDailyStatus(testEmp, todayStr);
    expect(status.status).toBe('wfh');
    expect(status.isExemptFromMissingCheckin).toBe(false);
  });

  it('6. Employee checking in via WFH app is immediately resolved as WFH', () => {
    const testEmp = 'emp_qa_res_checkin_wfh';
    const status = resolveEmployeeDailyStatus(testEmp, todayStr, { hasCheckedInWfhToday: true });
    expect(status.status).toBe('wfh');
    expect(status.location).toBe('wfh');
    expect(status.source).toBe('wfh_checkin');
    expect(status.isExemptFromMissingCheckin).toBe(false);
    expect(status.isExemptFromRoutineSpotCheck).toBe(false);
  });

  it('7. Employee checking in at Office is resolved as Office', () => {
    const testEmp = 'emp_qa_res_checkin_office';
    const status = resolveEmployeeDailyStatus(testEmp, todayStr, { isOfficeCheckin: true });
    expect(status.status).toBe('office');
    expect(status.location).toBe('office');
    expect(status.source).toBe('gps_auto');
    expect(status.isExemptFromMissingCheckin).toBe(true);
    expect(status.isExemptFromRoutineSpotCheck).toBe(true);
  });

  it('8. Real employee 1304 with weekly schedule is resolved as WFH on workdays', () => {
    // 2026-10-09 is Friday (workday)
    const status = resolveEmployeeDailyStatus('1304', '2026-10-09');
    expect(status.status).toBe('wfh');
    expect(status.location).toBe('wfh');
    expect(status.isExemptFromMissingCheckin).toBe(false);
    expect(status.isExemptFromRoutineSpotCheck).toBe(false);
  });
});

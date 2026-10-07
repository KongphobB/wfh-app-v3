import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDailyWorkLocation,
  setDailyWorkLocation,
  isEmployeeAtOfficeToday,
  getAllDailyWorkLocations,
} from '@/lib/dailyLocationStore';
import { getAllLeaveRequests } from '@/lib/leaveStore';

describe('Daily Work Location Store & Toggle Tests', () => {
  const testEmpId = 'test_qa_emp_location';
  const testDate = '2026-10-07';

  beforeEach(() => {
    // Reset to WFH
    setDailyWorkLocation(testEmpId, 'wfh', 'QA Tester', 'Admin', testDate);
  });

  it('1. Defaults to WFH for an employee with no record', () => {
    const loc = getDailyWorkLocation('non_existent_random_id_9999', testDate);
    expect(loc).toBe('wfh');
    expect(isEmployeeAtOfficeToday('non_existent_random_id_9999', testDate)).toBe(false);
  });

  it('2. Setting work location to Office updates store and isEmployeeAtOfficeToday', () => {
    setDailyWorkLocation(testEmpId, 'office', 'QA Tester', 'Admin', testDate);

    expect(getDailyWorkLocation(testEmpId, testDate)).toBe('office');
    expect(isEmployeeAtOfficeToday(testEmpId, testDate)).toBe(true);

    const allLocations = getAllDailyWorkLocations(testDate);
    expect(allLocations[testEmpId]).toBe('office');
  });

  it('3. Setting work location to Office creates an approved onsite record in leaveStore', () => {
    setDailyWorkLocation(testEmpId, 'office', 'QA Tester', 'Admin', testDate);

    const leaves = getAllLeaveRequests();
    const onsiteRecord = leaves.find(
      (l) =>
        l.employee_id === testEmpId &&
        l.start_date === testDate &&
        l.leave_type === 'ปฏิบัติงานที่ออฟฟิศ (Onsite)'
    );

    expect(onsiteRecord).toBeDefined();
    expect(onsiteRecord?.status).toBe('Approved');
  });

  it('4. Switching back to WFH updates store and removes auto-generated onsite record', () => {
    // Set to office first
    setDailyWorkLocation(testEmpId, 'office', 'QA Tester', 'Admin', testDate);
    expect(isEmployeeAtOfficeToday(testEmpId, testDate)).toBe(true);

    // Switch back to WFH
    setDailyWorkLocation(testEmpId, 'wfh', 'QA Tester', 'Admin', testDate);
    expect(getDailyWorkLocation(testEmpId, testDate)).toBe('wfh');
    expect(isEmployeeAtOfficeToday(testEmpId, testDate)).toBe(false);

    const leaves = getAllLeaveRequests();
    const onsiteRecord = leaves.find(
      (l) =>
        l.employee_id === testEmpId &&
        l.start_date === testDate &&
        l.leave_type === 'ปฏิบัติงานที่ออฟฟิศ (Onsite)' &&
        l.reason?.includes('แอดมิน')
    );
    expect(onsiteRecord).toBeUndefined();
  });
});

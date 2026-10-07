import { describe, it, expect, beforeEach } from 'vitest';
import { resolveEmployeeDailyStatus } from '@/lib/dailyStatus';
import {
  getDailyWorkLocation,
  setDailyWorkLocation,
  isEmployeeAtOfficeToday,
  getAllDailyWorkLocations,
  getDailyLocationRecord,
} from '@/lib/dailyLocationStore';
import {
  createLeaveRequest,
  updateLeaveStatus,
  getAllLeaveRequests,
} from '@/lib/leaveStore';
import { calculateHaversineDistanceMeters, isValidCoordinate } from '@/lib/geo';
import { getAllAuditLogs, createAuditLog } from '@/lib/auditStore';

describe('🏆 Comprehensive End-to-End System QA Test Suite', () => {
  const today = '2026-10-07';
  const tomorrow = '2026-10-08';
  const officeLat = 12.736929;
  const officeLng = 101.114387;

  // Distinct IDs for clean test isolation
  const empOfficeDefault = 'qa_emp_office_default';
  const empGpsTester = 'qa_emp_gps_switch';
  const empLeaveTester = 'qa_emp_leave_precedence';
  const empWfhAdvance = 'qa_emp_wfh_advance';
  const empSpotTester = 'qa_emp_spot_check_rules';

  it('QA Scenario 1: Default to Office & Complete Exemption from Missing Check-in', () => {
    // 1.1 Fresh employee with no prior setup
    const resolved = resolveEmployeeDailyStatus(empOfficeDefault, today);

    // Expected: Office status, 100% exempt from missing checkin & routine spotchecks
    expect(resolved.status).toBe('office');
    expect(resolved.location).toBe('office');
    expect(resolved.source).toBe('default_office');
    expect(resolved.isExemptFromMissingCheckin).toBe(true);
    expect(resolved.isExemptFromRoutineSpotCheck).toBe(true);

    // 1.2 Store query returns office
    expect(getDailyWorkLocation(empOfficeDefault, today)).toBe('office');
    expect(isEmployeeAtOfficeToday(empOfficeDefault, today)).toBe(true);
  });

  it('QA Scenario 2: GPS Geofence Detection & Anti-Loophole Auto-Switch to WFH', () => {
    // 2.1 Set employee to Office first (e.g. Admin or default)
    setDailyWorkLocation(empGpsTester, 'office', 'Somchai GPS', 'Admin', today);
    expect(getDailyWorkLocation(empGpsTester, today)).toBe('office');

    // 2.2 Case A: Employee checks in from Home (Bangkok, ~140km away from Rayong Office)
    const homeLat = 13.7563;
    const homeLng = 100.5018;
    expect(isValidCoordinate(homeLat, homeLng)).toBe(true);

    const distFromHome = calculateHaversineDistanceMeters(homeLat, homeLng, officeLat, officeLng);
    expect(distFromHome).toBeGreaterThan(200); // Far beyond 200m geofence!

    // Simulate checkin route GPS switch
    setDailyWorkLocation(
      empGpsTester,
      'wfh',
      'Somchai GPS',
      'ระบบตรวจจับพิกัด GPS อัตโนมัติ',
      today,
      {
        reason: `เช็คอินนอกพื้นที่บริษัท (${Math.round(distFromHome)} ม.) ปรับเป็น WFH อัตโนมัติ`,
        is_auto_gps: true,
      }
    );

    // Verify switch
    const rec = getDailyLocationRecord(empGpsTester, today);
    expect(rec?.location).toBe('wfh');
    expect(rec?.is_auto_gps).toBe(true);
    expect(rec?.reason).toContain('เช็คอินนอกพื้นที่');

    const statusAfterGps = resolveEmployeeDailyStatus(empGpsTester, today);
    expect(statusAfterGps.status).toBe('wfh');
    expect(statusAfterGps.isExemptFromMissingCheckin).toBe(false);
    expect(statusAfterGps.isExemptFromRoutineSpotCheck).toBe(false);

    // 2.3 Case B: Employee checks in Inside Office boundary (<200m)
    const insideOfficeLat = 12.736950;
    const insideOfficeLng = 101.114390;
    const distInside = calculateHaversineDistanceMeters(insideOfficeLat, insideOfficeLng, officeLat, officeLng);
    expect(distInside).toBeLessThanOrEqual(200);

    setDailyWorkLocation(empGpsTester, 'office', 'Somchai GPS', 'ระบบตรวจจับพิกัด GPS อัตโนมัติ', today, {
      reason: 'เช็คอินภายในพื้นที่บริษัท (เข้า Office)',
      is_auto_gps: false,
    });

    const recInside = getDailyLocationRecord(empGpsTester, today);
    expect(recInside?.location).toBe('office');
    expect(recInside?.is_auto_gps).toBe(false);
  });

  it('QA Scenario 3: Next-Day Auto-Reset without Midnight Cron', () => {
    // 3.1 Employee was set to WFH today
    setDailyWorkLocation('qa_emp_reset_test', 'wfh', 'Tester Reset', 'Admin', today);
    expect(getDailyWorkLocation('qa_emp_reset_test', today)).toBe('wfh');

    // 3.2 On tomorrow (new date), without any manual intervention, status must be Office!
    expect(getDailyWorkLocation('qa_emp_reset_test', tomorrow)).toBe('office');
    const tomorrowStatus = resolveEmployeeDailyStatus('qa_emp_reset_test', tomorrow);
    expect(tomorrowStatus.status).toBe('office');
    expect(tomorrowStatus.isExemptFromMissingCheckin).toBe(true);
    expect(tomorrowStatus.isExemptFromRoutineSpotCheck).toBe(true);
  });

  it('QA Scenario 4: Leave Priority & Exemption over Admin Toggle (Sick / Vacation / Personal)', () => {
    // 4.1 Admin set this employee to WFH
    setDailyWorkLocation(empLeaveTester, 'wfh', 'Leave Person', 'Admin', today);
    expect(getDailyWorkLocation(empLeaveTester, today)).toBe('wfh');

    // 4.2 Employee submits sick leave and supervisor approves it
    const sickLeave = createLeaveRequest({
      employee_id: empLeaveTester,
      employee_name: 'Leave Person',
      leave_type: 'ลาป่วย',
      start_date: today,
      end_date: today,
      reason: 'อาหารเป็นพิษ นอนพักผ่อน',
    });

    updateLeaveStatus({
      id: sickLeave.id,
      status: 'Approved',
      reviewed_by: 'Supervisor Big',
      review_note: 'อนุมัติการลา พักผ่อนให้หายไวๆ',
    });

    // 4.3 High-priority status resolution check:
    // Even though admin set WFH, the approved leave MUST override and exempt employee!
    const resolved = resolveEmployeeDailyStatus(empLeaveTester, today);
    expect(resolved.status).toBe('leave');
    expect(resolved.leaveType).toBe('ลาป่วย');
    expect(resolved.isExemptFromMissingCheckin).toBe(true);
    expect(resolved.isExemptFromRoutineSpotCheck).toBe(true);
    expect(resolved.reason).toContain('อาหารเป็นพิษ');
  });

  it('QA Scenario 5: Advance WFH Request Approval Workflow', () => {
    // 5.1 Employee submits advance WFH request
    const wfhReq = createLeaveRequest({
      employee_id: empWfhAdvance,
      employee_name: 'Advance WFH Employee',
      leave_type: 'ขอปฏิบัติงานที่บ้าน (WFH)',
      start_date: today,
      end_date: today,
      reason: 'มีช่างเข้ามาติดตั้งอินเทอร์เน็ตที่คอนโด',
    });
    expect(wfhReq.status).toBe('Pending');

    // 5.2 Supervisor reviews and approves
    updateLeaveStatus({
      id: wfhReq.id,
      status: 'Approved',
      reviewed_by: 'Supervisor Big',
      review_note: 'อนุมัติให้ WFH ได้ 1 วัน',
    });

    // 5.3 Daily work location automatically switches to WFH
    expect(getDailyWorkLocation(empWfhAdvance, today)).toBe('wfh');

    const resolved = resolveEmployeeDailyStatus(empWfhAdvance, today);
    expect(resolved.status).toBe('wfh');
    expect(resolved.isExemptFromMissingCheckin).toBe(false);
    expect(resolved.isExemptFromRoutineSpotCheck).toBe(false);
  });

  it('QA Scenario 6: Spot Check Tick Filter Rules for Office vs WFH vs Leave', () => {
    const routineCheck = { id: 'SPOT-ROUTINE-1', round: 'เช้า', scheduled_time: '10:00:00' };
    const manualCheck = { id: 'SPOT-MANUAL-999', round: 'เฉพาะกิจ (หัวหน้าสั่งตรวจ)', scheduled_time: '11:00:00' };

    // Case A: Office Employee
    setDailyWorkLocation(empSpotTester, 'office', 'Spot Target', 'Admin', today);
    const officeEmpStatus = resolveEmployeeDailyStatus(empSpotTester, today);
    expect(officeEmpStatus.isExemptFromRoutineSpotCheck).toBe(true);

    // Routine checks MUST be filtered out
    const officeChecks = [routineCheck, manualCheck].filter(
      (c) => !officeEmpStatus.isExemptFromRoutineSpotCheck || c.round.includes('เฉพาะกิจ')
    );
    expect(officeChecks.length).toBe(1);
    expect(officeChecks[0].id).toBe('SPOT-MANUAL-999'); // Manual check still allowed!

    // Case B: WFH Employee
    setDailyWorkLocation(empSpotTester, 'wfh', 'Spot Target', 'Admin', today);
    const wfhEmpStatus = resolveEmployeeDailyStatus(empSpotTester, today);
    expect(wfhEmpStatus.isExemptFromRoutineSpotCheck).toBe(false);

    // All checks preserved for WFH
    const wfhChecks = [routineCheck, manualCheck].filter(
      (c) => !wfhEmpStatus.isExemptFromRoutineSpotCheck || c.round.includes('เฉพาะกิจ')
    );
    expect(wfhChecks.length).toBe(2);
  });
});

import { getHolidayByDate } from './holidayStore';
import { getAllLeaveRequests, isEmployeeOnApprovedLeave } from './leaveStore';
import { getDailyWorkLocation, WorkLocationMode } from './dailyLocationStore';
import { getThaiDateStr } from './timeSync';

export type ResolvedDailyStatus =
  | 'holiday'       // วันหยุด เสาร์-อาทิตย์ หรือวันหยุดนักขัตฤกษ์
  | 'leave'         // ลาป่วย, ลากิจ, ลาพักร้อน (อนุมัติแล้ว)
  | 'leave_pending' // มีใบลาที่รออนุมัติ
  | 'wfh'           // ปฏิบัติงานที่บ้าน (WFH)
  | 'office';       // ปฏิบัติงานที่ออฟฟิศ (ค่าเริ่มต้น หรือระบุเข้าออฟฟิศ)

export interface DailyStatusDetail {
  status: ResolvedDailyStatus;
  location: WorkLocationMode;
  reason: string;
  source: 'holiday' | 'leave_approved' | 'leave_pending' | 'admin_toggle' | 'gps_auto' | 'default_office';
  leaveType?: string;
  isExemptFromMissingCheckin: boolean;
  isExemptFromRoutineSpotCheck: boolean;
}

/**
 * คำนวณสถานะการทำงานประจำวันของพนักงานเดี่ยว ตามลำดับความสำคัญ (Priority):
 * 1. วันหยุด (เสาร์-อาทิตย์ / นักขัตฤกษ์) -> holiday
 * 2. ใบลาที่อนุมัติแล้ว (ลาป่วย/ลากิจ/ลาพักร้อน) -> leave
 * 3. ใบลาที่รออนุมัติ -> leave_pending
 * 4. ค่าที่บันทึกไว้ใน dailyLocationStore (รวมการสลับโดย Admin และการตรวจจับ GPS อัตโนมัติ)
 * 5. ตรวจสอบใบแจ้งขอ WFH ล่วงหน้า
 * 6. ค่าเริ่มต้น: office (เข้าออฟฟิศ)
 */
export function resolveEmployeeDailyStatus(
  employeeId: string,
  dateStr?: string
): DailyStatusDetail {
  const date = dateStr || getThaiDateStr();

  // 1. ตรวจสอบวันหยุดสุดสัปดาห์ (เสาร์ - อาทิตย์)
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
  }).format(new Date(`${date}T12:00:00+07:00`));

  if (dayName === 'Sat' || dayName === 'Sun') {
    return {
      status: 'holiday',
      location: 'office',
      reason: 'วันหยุดสุดสัปดาห์ (เสาร์-อาทิตย์)',
      source: 'holiday',
      isExemptFromMissingCheckin: true,
      isExemptFromRoutineSpotCheck: true,
    };
  }

  // ตรวจสอบวันหยุดนักขัตฤกษ์/วันหยุดบริษัท
  const holiday = getHolidayByDate(date);
  if (holiday) {
    return {
      status: 'holiday',
      location: 'office',
      reason: `วันหยุด (${holiday.name})`,
      source: 'holiday',
      isExemptFromMissingCheckin: true,
      isExemptFromRoutineSpotCheck: true,
    };
  }

  // 2. ตรวจสอบประวัติการลา (Leave Requests)
  const leaves = getAllLeaveRequests().filter(
    (l) => l.employee_id === employeeId && l.start_date <= date && date <= l.end_date
  );

  // 2.1 ลาอนุมัติแล้ว (ลาป่วย / ลากิจ / ลาพักร้อน)
  const approvedAbsenceLeave = leaves.find(
    (l) =>
      l.status === 'Approved' &&
      ['ลาป่วย', 'ลากิจ', 'ลาพักร้อน'].includes(l.leave_type)
  );

  if (approvedAbsenceLeave) {
    return {
      status: 'leave',
      location: 'office',
      reason: `อนุมัติการลา: ${approvedAbsenceLeave.leave_type} (${approvedAbsenceLeave.reason})`,
      source: 'leave_approved',
      leaveType: approvedAbsenceLeave.leave_type,
      isExemptFromMissingCheckin: true,
      isExemptFromRoutineSpotCheck: true,
    };
  }

  // 2.2 ใบลาที่รออนุมัติ (Pending) -> พักการแจ้งเตือนสาย/ขาดไว้ก่อน
  const pendingAbsenceLeave = leaves.find(
    (l) =>
      l.status === 'Pending' &&
      ['ลาป่วย', 'ลากิจ', 'ลาพักร้อน'].includes(l.leave_type)
  );

  if (pendingAbsenceLeave) {
    return {
      status: 'leave_pending',
      location: 'office',
      reason: `ยื่นคำขอ ${pendingAbsenceLeave.leave_type} (รอหัวหน้างานอนุมัติ)`,
      source: 'leave_pending',
      leaveType: pendingAbsenceLeave.leave_type,
      isExemptFromMissingCheckin: true,
      isExemptFromRoutineSpotCheck: true,
    };
  }

  // 3. ตรวจสอบสถานะจาก dailyLocationStore (รวมการตั้งค่าของ Admin และการคำนวณ GPS อัตโนมัติ)
  const storedLocation = getDailyWorkLocation(employeeId, date);
  if (storedLocation === 'wfh') {
    return {
      status: 'wfh',
      location: 'wfh',
      reason: 'ปฏิบัติงานที่บ้าน (WFH)',
      source: 'admin_toggle',
      isExemptFromMissingCheckin: false,
      isExemptFromRoutineSpotCheck: false,
    };
  }

  // 4. ค่าเริ่มต้นสำหรับทุกคน (Default): ปฏิบัติงานที่ออฟฟิศ (Office)
  // พนักงานเข้าออฟฟิศใช้ระบบสแกนหน้าของบริษัท ยกเว้นการเช็คอินและการสุ่มตรวจในแอปนี้อัตโนมัติ
  return {
    status: 'office',
    location: 'office',
    reason: 'ปฏิบัติงานที่ออฟฟิศ (ค่าเริ่มต้น / ระบบสแกนหน้าบริษัท)',
    source: 'default_office',
    isExemptFromMissingCheckin: true,
    isExemptFromRoutineSpotCheck: true,
  };
}

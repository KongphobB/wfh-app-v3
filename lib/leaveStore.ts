import { LeaveRequest, LeaveType, LeaveStatus } from '@/types';

// In-memory persistent store for Leave Requests
let memoryLeaveRequests: LeaveRequest[] = (global as any).__memoryLeaveRequests || [
  {
    id: 'leave_init_1',
    employee_id: '1304',
    employee_name: 'ก้องภพ บุญชู',
    department: 'Project',
    leave_type: 'ปฏิบัติงานที่ออฟฟิศ (Onsite)',
    start_date: '2026-08-15',
    end_date: '2026-08-15',
    reason: 'เข้าประชุมวางแผนระบบ ณ สำนักงานใหญ่',
    status: 'Approved',
    reviewed_by: '8888 (เขมิกา)',
    reviewed_at: '2026-08-14T17:00:00+07:00',
    review_note: 'อนุมัติเรียบร้อย',
    created_at: '2026-08-14T10:30:00+07:00',
  },
  {
    id: 'leave_init_2',
    employee_id: '1111',
    employee_name: 'ก้องภพ',
    department: 'IT',
    leave_type: 'ลาป่วย',
    start_date: '2026-08-18',
    end_date: '2026-08-18',
    reason: 'มีไข้หวัด พักรักษาตัว',
    status: 'Approved',
    reviewed_by: '8888 (เขมิกา)',
    reviewed_at: '2026-08-18T07:45:00+07:00',
    review_note: 'อนุมัติ ขอให้หายไวๆ ครับ',
    created_at: '2026-08-18T07:30:00+07:00',
  },
];
(global as any).__memoryLeaveRequests = memoryLeaveRequests;

export function getAllLeaveRequests(): LeaveRequest[] {
  return memoryLeaveRequests;
}

export function getLeaveRequestsForUser(employeeId: string, role?: string): LeaveRequest[] {
  if (role === 'admin' || role === 'supervisor') {
    return memoryLeaveRequests;
  }
  return memoryLeaveRequests.filter((r) => r.employee_id === employeeId);
}

export function createLeaveRequest(params: {
  employee_id: string;
  employee_name: string;
  department?: string | null;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: 'image' | 'pdf' | null;
}): LeaveRequest {
  const isOnsite = params.leave_type === 'ปฏิบัติงานที่ออฟฟิศ (Onsite)';

  const newRequest: LeaveRequest = {
    id: `leave_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    employee_id: params.employee_id,
    employee_name: params.employee_name,
    department: params.department || null,
    leave_type: params.leave_type,
    start_date: params.start_date,
    end_date: params.end_date,
    reason: params.reason,
    status: isOnsite ? 'Approved' : 'Pending',
    reviewed_by: isOnsite ? 'ระบบอัตโนมัติ (Auto-approved)' : null,
    reviewed_at: isOnsite ? new Date().toISOString() : null,
    review_note: isOnsite ? 'อนุมัติเข้าปฏิบัติงานที่ออฟฟิศอัตโนมัติ' : null,
    attachment_url: params.attachment_url || null,
    attachment_name: params.attachment_name || null,
    attachment_type: params.attachment_type || null,
    created_at: new Date().toISOString(),
  };

  memoryLeaveRequests.unshift(newRequest);
  return newRequest;
}

export function updateLeaveStatus(params: {
  id: string;
  status: LeaveStatus;
  reviewed_by: string;
  review_note?: string | null;
}): LeaveRequest | null {
  const index = memoryLeaveRequests.findIndex((r) => r.id === params.id);
  if (index === -1) return null;

  memoryLeaveRequests[index] = {
    ...memoryLeaveRequests[index],
    status: params.status,
    reviewed_by: params.reviewed_by,
    reviewed_at: new Date().toISOString(),
    review_note: params.review_note || null,
  };

  return memoryLeaveRequests[index];
}

/**
 * Check if an employee is on approved leave today
 */
export function isEmployeeOnApprovedLeave(employeeId: string, dateStr: string): boolean {
  return memoryLeaveRequests.some((r) => {
    if (r.employee_id !== employeeId || r.status !== 'Approved') return false;
    // Check date interval inclusive: start_date <= dateStr <= end_date
    return r.start_date <= dateStr && dateStr <= r.end_date;
  });
}

import fs from 'fs';
import path from 'path';
import { LeaveRequest, LeaveType, LeaveStatus } from '@/types';
import { callGAS } from './gas';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_LEAVE_FILE = path.join(DATA_DIR, 'leave_requests.json');
const TMP_LEAVE_FILE = '/tmp/leave_requests.json';

function getStoragePath(): string {
  if (process.env.VERCEL) {
    return TMP_LEAVE_FILE;
  }
  return LOCAL_LEAVE_FILE;
}

function ensureDir(filePath: string) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {}
}

const INITIAL_LEAVES: LeaveRequest[] = [
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

function loadFromDisk(): LeaveRequest[] {
  const filePath = getStoragePath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content && content.trim()) {
        const list = JSON.parse(content);
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load leave requests from disk:', err);
  }
  return INITIAL_LEAVES;
}

function saveToDisk(records: LeaveRequest[]) {
  const filePath = getStoragePath();
  try {
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save leave requests to disk:', err);
  }
}

// In-memory persistent store for Leave Requests
let memoryLeaveRequests: LeaveRequest[] = (global as any).__memoryLeaveRequests;
if (!memoryLeaveRequests) {
  memoryLeaveRequests = loadFromDisk();
  (global as any).__memoryLeaveRequests = memoryLeaveRequests;
}

export function getAllLeaveRequests(): LeaveRequest[] {
  if (!memoryLeaveRequests || memoryLeaveRequests.length === 0) {
    memoryLeaveRequests = loadFromDisk();
    (global as any).__memoryLeaveRequests = memoryLeaveRequests;
  }
  return memoryLeaveRequests;
}

export function getLeaveRequestsForUser(employeeId: string, role?: string): LeaveRequest[] {
  const list = getAllLeaveRequests();
  if (role === 'admin' || role === 'supervisor') {
    return list;
  }
  return list.filter((r) => r.employee_id === employeeId);
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

  const list = getAllLeaveRequests();
  list.unshift(newRequest);
  saveToDisk(list);

  // Sync to Google Sheet in background
  try {
    callGAS('checkin', {
      type: 'การลา',
      employeeId: params.employee_id,
      note: `[ยื่นคำขอ${params.leave_type}] ${params.start_date} ถึง ${params.end_date} เหตุผล: ${params.reason} สถานะ: ${newRequest.status}`,
    }).catch((err) => console.warn('Background GAS sync leave error:', err));
  } catch {}

  return newRequest;
}

export function updateLeaveStatus(params: {
  id: string;
  status: LeaveStatus;
  reviewed_by: string;
  review_note?: string | null;
}): LeaveRequest | null {
  const list = getAllLeaveRequests();
  const index = list.findIndex((r) => r.id === params.id);
  if (index === -1) return null;

  list[index] = {
    ...list[index],
    status: params.status,
    reviewed_by: params.reviewed_by,
    reviewed_at: new Date().toISOString(),
    review_note: params.review_note || null,
  };

  const updatedReq = list[index];
  saveToDisk(list);

  // Sync approval to Google Sheet in background
  try {
    callGAS('checkin', {
      type: 'การลา',
      employeeId: updatedReq.employee_id,
      note: `[ผลการพิจารณา${updatedReq.leave_type}: ${params.status}] ${updatedReq.start_date} ถึง ${updatedReq.end_date} ผู้พิจารณา: ${params.reviewed_by}${params.review_note ? ` หมายเหตุ: ${params.review_note}` : ''}`,
    }).catch((err) => console.warn('Background GAS sync leave update error:', err));
  } catch {}

  return updatedReq;
}

/**
 * Check if an employee is on approved absence leave today (ลาป่วย, ลากิจ, ลาพักร้อน)
 */
export function isEmployeeOnApprovedLeave(employeeId: string, dateStr: string): boolean {
  const list = getAllLeaveRequests();
  return list.some((r) => {
    if (r.employee_id !== employeeId || r.status !== 'Approved') return false;
    // Check if it's an absence leave type (not onsite)
    const isAbsence = ['ลาป่วย', 'ลากิจ', 'ลาพักร้อน'].includes(r.leave_type);
    if (!isAbsence) return false;
    // Check date interval inclusive: start_date <= dateStr <= end_date
    return r.start_date <= dateStr && dateStr <= r.end_date;
  });
}

/**
 * Check if an employee is on approved WFH request today
 */
export function isEmployeeOnApprovedWFH(employeeId: string, dateStr: string): boolean {
  const list = getAllLeaveRequests();
  return list.some((r) => {
    if (r.employee_id !== employeeId || r.status !== 'Approved') return false;
    if (r.leave_type !== 'ขอปฏิบัติงานที่บ้าน (WFH)') return false;
    return r.start_date <= dateStr && dateStr <= r.end_date;
  });
}

export type Role = 'employee' | 'supervisor' | 'admin';
export type UserRole = Role;
export type WfhStatus = 'เปิดสิทธิ์' | 'ระงับสิทธิ์';
export type CheckinType = 'เข้างาน' | 'ออกงาน' | 'ยืนยันตัวตน';
export type VerificationStatus =
  | 'ปฏิบัติงานที่ออฟฟิศ'
  | 'นอกพื้นที่ (WFH)'
  | 'ระบุตำแหน่งไม่ได้'
  | 'เข้างานสาย'
  | 'ออกงานก่อนเวลา'
  | 'ยืนยันตัวตนรอบ 2 สำเร็จ'
  | 'ยืนยันตัวตนสาย (ถือเป็นขาดงาน)'
  | 'นอกรัศมี 20 กม. (ถือเป็นขาดงาน)';

export type SpotCheckStatus =
  | 'Scheduled'
  | 'Pending'
  | 'Pass'
  | 'Fail'
  | 'Expired'
  | 'ไม่ผ่านการสุ่มตรวจ (เลยเวลา)'
  | 'ไม่ผ่านการสุ่มตรวจ (ขาดการติดต่อ)'
  | (string & {});

export type TicketStatus = 'Pending' | 'Resolved';
export type NotificationType =
  | 'spotcheck'
  | 'task_rated'
  | 'ticket'
  | 'ticket_created'
  | 'ticket_updated'
  | 'suspension'
  | 'missing_checkin'
  | (string & {});

export interface Employee {
  employee_id: string;
  name: string;
  email?: string | null;
  department?: string | null;
  position?: string | null;
  supervisor_id?: string | null;
  pin_hash?: string;
  one_star_count: number;
  wfh_status: WfhStatus;
  force_pin_change: boolean;
  role: Role;
  is_photo_exempt?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CheckinLog {
  id: string;
  employee_id: string;
  employee_name?: string | null;
  department?: string | null;
  position?: string | null;
  log_type: CheckinType;
  log_date: string;
  log_time: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
  photo_url?: string | null;
  has_photo?: boolean;
  note?: string | null;
  out_of_bounds_reason?: string | null;
  is_early_leave?: boolean;
  verification_status: VerificationStatus | (string & {});
  created_at?: string;
  updated_at?: string;
}

export interface TaskItem {
  id: string;
  submit_date: string;
  employee_id: string;
  employee_name?: string;
  tasks_assigned: number;
  tasks_completed: number;
  details?: string | null;
  submission_link?: string | null;
  star_rating?: number | null;
  supervisor_note?: string | null;
  supervisor_id?: string | null;
  rating_date?: string | null;
  created_at?: string;
}

export interface SpotCheck {
  id: string;
  check_date: string;
  round: 'เช้า' | 'บ่าย' | string;
  scheduled_time: string;
  employee_id: string;
  employee_name?: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
  photo_url?: string | null;
  actual_scan_time?: string | null;
  result_status: SpotCheckStatus;
  created_at?: string;
}

export interface Ticket {
  id: string;
  employee_id: string;
  employee_name?: string;
  problem_type: string;
  description?: string | null;
  status: TicketStatus;
  admin_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AppConfig {
  key: string;
  value: string;
  description?: string | null;
}

export interface AppNotification {
  id: string;
  employee_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}
export type NotificationItem = AppNotification;

export interface SessionPayload {
  employee_id: string;
  name: string;
  role: Role;
  department?: string;
  force_pin_change: boolean;
}

export type LeaveType = 'ลาป่วย' | 'ลากิจ' | 'ลาพักร้อน' | 'ปฏิบัติงานที่ออฟฟิศ (Onsite)';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  department?: string | null;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: 'image' | 'pdf' | null;
  created_at: string;
}

export type AuditActionType =
  | 'UNSUSPEND_WFH'
  | 'SUSPEND_WFH'
  | 'EDIT_EMPLOYEE'
  | 'CREATE_EMPLOYEE'
  | 'TOGGLE_PHOTO_EXEMPT'
  | 'UPDATE_CONFIG'
  | 'RESOLVE_TICKET'
  | 'RESPOND_SUGGESTION'
  | 'ADD_HOLIDAY'
  | 'TOGGLE_HOLIDAY'
  | 'DELETE_HOLIDAY'
  | 'UPDATE_POLICY_DOC'
  | 'APPROVE_LEAVE'
  | 'REJECT_LEAVE'
  | 'SYSTEM_ACTION';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  admin_id: string;
  admin_name: string;
  action_type: AuditActionType;
  action_title: string;
  target_employee_id?: string | null;
  target_employee_name?: string | null;
  details: string;
  ip_address?: string | null;
}

export interface AnalyticsSummary {
  period: string;
  totalWorkdays: number;
  onTimeCheckinCount: number;
  lateCheckinCount: number;
  onTimeRate: number;
  avgStarRating: number;
  totalRatingsCount: number;
  totalTasksAssigned: number;
  totalTasksCompleted: number;
  taskCompletionRate: number;
  spotCheckPassCount: number;
  spotCheckTotalCount: number;
  spotCheckComplianceRate: number;
  leaveDaysCount: number;
  starDistribution: { [star: number]: number };
  dailyTrends: {
    date: string;
    dayLabel: string;
    checkinStatus: 'on-time' | 'late' | 'leave' | 'missing' | 'none';
    checkinTime?: string | null;
    starRating?: number | null;
    tasksCount?: number;
  }[];
}

export type SuggestionCategory = 'ทั่วไป' | 'การทำงาน WFH' | 'ระบบและอุปกรณ์' | 'สวัสดิการและสถานที่' | 'อื่นๆ';
export type SuggestionStatus = 'New' | 'In Progress' | 'Resolved';

export interface SuggestionItem {
  id: string;
  topic: string;
  category: SuggestionCategory;
  content: string;
  is_anonymous: boolean;
  employee_id?: string | null;
  employee_name?: string | null;
  department?: string | null;
  status: SuggestionStatus;
  admin_note?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CompanyHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  name_en?: string;
  type: 'official' | 'company';
  is_active: boolean;
  notes?: string | null;
}

export interface HolidayPolicyDoc {
  file_name: string;
  file_url: string;
  file_type: 'pdf' | 'image' | 'link';
  file_size?: string | null;
  uploaded_at: string;
  uploaded_by?: string;
}

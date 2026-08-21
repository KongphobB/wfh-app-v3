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

import { AuditLogItem, AuditActionType } from '@/types';

const defaultAuditLogs: AuditLogItem[] = [
  {
    id: 'audit_init_001',
    timestamp: '2026-08-24T08:30:00+07:00',
    admin_id: '1001',
    admin_name: 'ผู้ดูแลระบบ (Admin Desk)',
    action_type: 'UPDATE_CONFIG',
    action_title: 'อัปเดตการตั้งค่าพิกัดสำนักงาน',
    details: 'ตั้งค่าพิกัดบริษัท SNU Supply and Service Co., Ltd. (Lat: 13.7203, Lng: 100.5985, Radius: 500m)',
    ip_address: '192.168.1.10',
  },
  {
    id: 'audit_init_002',
    timestamp: '2026-08-24T09:15:00+07:00',
    admin_id: '1001',
    admin_name: 'ผู้ดูแลระบบ (Admin Desk)',
    action_type: 'UPDATE_POLICY_DOC',
    action_title: 'อัปเดตไฟล์ประกาศวันหยุดบริษัท',
    details: 'แนบประกาศบริษัท ที่ 005/2568 เรื่อง วันหยุดนักขัตฤกษ์ประจำปี 2569 (SNU Supply and Service)',
    ip_address: '192.168.1.10',
  },
  {
    id: 'audit_init_003',
    timestamp: '2026-08-24T09:45:00+07:00',
    admin_id: '1001',
    admin_name: 'ผู้ดูแลระบบ (Admin Desk)',
    action_type: 'TOGGLE_PHOTO_EXEMPT',
    action_title: 'ปรับสิทธิ์การยกเว้นถ่ายรูป',
    target_employee_id: '1304',
    target_employee_name: 'ก้องภพ บุญชู',
    details: 'เปิดการยกเว้นการถ่ายรูป (Photo Exempt) สำหรับตำแหน่งผู้บริหาร/งานสนาม',
    ip_address: '192.168.1.10',
  },
];

(global as any).__memoryAuditLogs = (global as any).__memoryAuditLogs || [...defaultAuditLogs];

export function getAllAuditLogs(): AuditLogItem[] {
  const logs: AuditLogItem[] = (global as any).__memoryAuditLogs || defaultAuditLogs;
  return [...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function createAuditLog(params: {
  admin_id: string;
  admin_name: string;
  action_type: AuditActionType;
  action_title: string;
  target_employee_id?: string | null;
  target_employee_name?: string | null;
  details: string;
  ip_address?: string | null;
}): AuditLogItem {
  const logs: AuditLogItem[] = (global as any).__memoryAuditLogs;
  const newLog: AuditLogItem = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    admin_id: params.admin_id,
    admin_name: params.admin_name,
    action_type: params.action_type,
    action_title: params.action_title,
    target_employee_id: params.target_employee_id || null,
    target_employee_name: params.target_employee_name || null,
    details: params.details,
    ip_address: params.ip_address || '127.0.0.1',
  };

  logs.unshift(newLog);
  return newLog;
}

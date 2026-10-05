import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLeaveRequest,
  updateLeaveStatus,
  getAllLeaveRequests,
  getLeaveRequestsForUser,
  isEmployeeOnApprovedLeave,
} from '@/lib/leaveStore';
import { createAuditLog, getAllAuditLogs } from '@/lib/auditStore';

describe('Leave Requests & Audit Trail QA Suite', () => {
  describe('1. Leave Request Creation & Auto-approval', () => {
    it('Creates regular sick leave with "Pending" status', () => {
      const leave = createLeaveRequest({
        employee_id: 'qa_user_1',
        employee_name: 'สมหญิง มีสุข',
        department: 'HR',
        leave_type: 'ลาป่วย',
        start_date: '2026-10-10',
        end_date: '2026-10-11',
        reason: 'ปวดศีรษะ เป็นหวัด',
      });

      expect(leave.id).toBeDefined();
      expect(leave.status).toBe('Pending');
      expect(leave.reviewed_by).toBeNull();
      expect(leave.leave_type).toBe('ลาป่วย');
    });

    it('Auto-approves Onsite work request with "Approved" status', () => {
      const onsite = createLeaveRequest({
        employee_id: 'qa_user_2',
        employee_name: 'สมชาย รักงาน',
        department: 'Operations',
        leave_type: 'ปฏิบัติงานที่ออฟฟิศ (Onsite)',
        start_date: '2026-10-12',
        end_date: '2026-10-12',
        reason: 'เข้าประชุมประจำเดือนที่สำนักงานใหญ่',
      });

      expect(onsite.status).toBe('Approved');
      expect(onsite.reviewed_by).toContain('Auto-approved');
      expect(onsite.reviewed_at).toBeDefined();
    });

    it('Stores attachment details (URL, name, type) properly', () => {
      const leaveWithAttach = createLeaveRequest({
        employee_id: 'qa_user_3',
        employee_name: 'กิตติศักดิ์ พักผ่อน',
        leave_type: 'ลาป่วย',
        start_date: '2026-10-15',
        end_date: '2026-10-16',
        reason: 'มีใบรับรองแพทย์จาก รพ.',
        attachment_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        attachment_name: 'medical_cert.jpg',
        attachment_type: 'image',
      });

      expect(leaveWithAttach.attachment_url).toContain('data:image/jpeg;base64');
      expect(leaveWithAttach.attachment_name).toBe('medical_cert.jpg');
      expect(leaveWithAttach.attachment_type).toBe('image');
    });
  });

  describe('2. Leave Status Update (Supervisor / Admin Review)', () => {
    it('Approves pending leave with supervisor review note', () => {
      const req = createLeaveRequest({
        employee_id: 'qa_user_4',
        employee_name: 'มานะ ขยัน',
        leave_type: 'ลากิจ',
        start_date: '2026-11-01',
        end_date: '2026-11-02',
        reason: 'ติดต่อราชการทำบัตรประชาชน',
      });

      const updated = updateLeaveStatus({
        id: req.id,
        status: 'Approved',
        reviewed_by: '8888 (เขมิกา)',
        review_note: 'อนุมัติเรียบร้อยครับ',
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe('Approved');
      expect(updated?.reviewed_by).toBe('8888 (เขมิกา)');
      expect(updated?.review_note).toBe('อนุมัติเรียบร้อยครับ');
    });

    it('Rejects pending leave with explanation note', () => {
      const req = createLeaveRequest({
        employee_id: 'qa_user_5',
        employee_name: 'มานี ดีใจ',
        leave_type: 'ลาพักร้อน',
        start_date: '2026-11-10',
        end_date: '2026-11-12',
        reason: 'ไปเที่ยวพักผ่อน',
      });

      const updated = updateLeaveStatus({
        id: req.id,
        status: 'Rejected',
        reviewed_by: '9999 (แอดมิน)',
        review_note: 'ช่วงเวลาดังกล่าวมีงานเร่งด่วน กรุณาเลื่อนวันครับ',
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe('Rejected');
      expect(updated?.review_note).toContain('งานเร่งด่วน');
    });
  });

  describe('3. isEmployeeOnApprovedLeave Check', () => {
    it('Returns true during approved leave interval', () => {
      const req = createLeaveRequest({
        employee_id: 'qa_emp_leave_test',
        employee_name: 'ทดสอบ ลางาน',
        leave_type: 'ลาพักร้อน',
        start_date: '2026-10-20',
        end_date: '2026-10-22',
        reason: 'พักร้อน',
      });
      updateLeaveStatus({
        id: req.id,
        status: 'Approved',
        reviewed_by: 'Supervisor',
      });

      // Start date
      expect(isEmployeeOnApprovedLeave('qa_emp_leave_test', '2026-10-20')).toBe(true);
      // Middle date
      expect(isEmployeeOnApprovedLeave('qa_emp_leave_test', '2026-10-21')).toBe(true);
      // End date
      expect(isEmployeeOnApprovedLeave('qa_emp_leave_test', '2026-10-22')).toBe(true);
      // Before leave
      expect(isEmployeeOnApprovedLeave('qa_emp_leave_test', '2026-10-19')).toBe(false);
      // After leave
      expect(isEmployeeOnApprovedLeave('qa_emp_leave_test', '2026-10-23')).toBe(false);
    });

    it('Returns false if leave is Pending or Rejected', () => {
      const pendingReq = createLeaveRequest({
        employee_id: 'qa_pending_user',
        employee_name: 'รอยืนยัน',
        leave_type: 'ลาป่วย',
        start_date: '2026-10-25',
        end_date: '2026-10-25',
        reason: 'ป่วย',
      });

      expect(isEmployeeOnApprovedLeave('qa_pending_user', '2026-10-25')).toBe(false);

      updateLeaveStatus({
        id: pendingReq.id,
        status: 'Rejected',
        reviewed_by: 'Admin',
      });

      expect(isEmployeeOnApprovedLeave('qa_pending_user', '2026-10-25')).toBe(false);
    });
  });

  describe('4. Audit Trail Store', () => {
    it('Creates and logs audit trail record correctly', () => {
      const log = createAuditLog({
        admin_id: '9999',
        admin_name: 'ผู้ดูแลระบบสูงสุด',
        action_type: 'EDIT_EMPLOYEE',
        action_title: 'รีเซ็ตรหัส PIN พนักงาน',
        target_employee_id: '1111',
        target_employee_name: 'สมชาย',
        details: 'รีเซ็ตรหัส PIN เป็น 1234 ตามคำขอ',
        ip_address: '10.0.0.1',
      });

      expect(log.id).toBeDefined();
      expect(log.action_type).toBe('EDIT_EMPLOYEE');
      expect(log.target_employee_id).toBe('1111');

      const allLogs = getAllAuditLogs();
      const found = allLogs.find((l) => l.id === log.id);
      expect(found).toBeDefined();
      expect(found?.admin_name).toBe('ผู้ดูแลระบบสูงสุด');
    });

    it('Sorts audit logs descending by timestamp', () => {
      const logs = getAllAuditLogs();
      for (let i = 0; i < logs.length - 1; i++) {
        expect(logs[i].timestamp.localeCompare(logs[i + 1].timestamp)).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

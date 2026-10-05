import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

describe('API Input Validation & Schema Guard QA Suite', () => {
  describe('1. Login Schema Validation', () => {
    const loginSchema = z.object({
      employee_id: z.string().min(1, 'กรุณากรอกรหัสพนักงาน'),
      pin: z.string().length(4, 'รหัส PIN ต้องมี 4 หลัก'),
      unblock: z.boolean().optional(),
    });

    it('Accepts valid credentials', () => {
      const res = loginSchema.safeParse({ employee_id: '1111', pin: '1234' });
      expect(res.success).toBe(true);
    });

    it('Rejects empty employee_id', () => {
      const res = loginSchema.safeParse({ employee_id: '', pin: '1234' });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('กรุณากรอกรหัสพนักงาน');
      }
    });

    it('Rejects PIN with non-4 length', () => {
      const res1 = loginSchema.safeParse({ employee_id: '1111', pin: '12' });
      expect(res1.success).toBe(false);

      const res2 = loginSchema.safeParse({ employee_id: '1111', pin: '12345' });
      expect(res2.success).toBe(false);
    });
  });

  describe('2. Registration Schema Validation', () => {
    const registerSchema = z.object({
      employee_id: z.string().min(4, 'รหัสพนักงานต้องมีอย่างน้อย 4 หลัก').max(6, 'รหัสพนักงานไม่เกิน 6 หลัก'),
      name: z.string().min(2, 'กรุณาระบุชื่อ-นามสกุล'),
      email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional().or(z.literal('')),
      department: z.string().optional().or(z.literal('')),
      position: z.string().optional().or(z.literal('')),
      pin: z.string().length(4, 'รหัส PIN ต้องเป็นตัวเลข 4 หลัก'),
    });

    it('Validates correct registration data', () => {
      const res = registerSchema.safeParse({
        employee_id: '1234',
        name: 'สมเกียรติ มั่นคง',
        email: 'somkiat@company.com',
        department: 'IT',
        position: 'Backend Developer',
        pin: '5678',
      });
      expect(res.success).toBe(true);
    });

    it('Rejects invalid email format', () => {
      const res = registerSchema.safeParse({
        employee_id: '1234',
        name: 'สมเกียรติ',
        email: 'not-an-email',
        pin: '1234',
      });
      expect(res.success).toBe(false);
    });

    it('Allows empty string for email, department, position', () => {
      const res = registerSchema.safeParse({
        employee_id: '1234',
        name: 'สมเกียรติ',
        email: '',
        department: '',
        position: '',
        pin: '1234',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('3. Daily Task Submission Schema Validation', () => {
    const createTaskSchema = z.object({
      tasks_assigned: z.number().min(1, 'จำนวนงานต้องมากกว่า 0'),
      tasks_completed: z.number().min(0, 'จำนวนงานสำเร็จต้องไม่ติดลบ'),
      details: z.string().min(1, 'กรุณาระบุรายละเอียดงาน'),
      submission_link: z.string().url('รูปแบบ URL ไม่ถูกต้อง').optional().or(z.literal('')),
    });

    it('Validates properly formatted task report', () => {
      const res = createTaskSchema.safeParse({
        tasks_assigned: 3,
        tasks_completed: 3,
        details: 'ทำระบบ QA และทดสอบระบบ WFH ทั้งหมด',
        submission_link: 'https://github.com/company/repo/pull/1',
      });
      expect(res.success).toBe(true);
    });

    it('Rejects task with 0 assigned tasks', () => {
      const res = createTaskSchema.safeParse({
        tasks_assigned: 0,
        tasks_completed: 0,
        details: 'ว่างงาน',
      });
      expect(res.success).toBe(false);
    });

    it('Rejects malformed link', () => {
      const res = createTaskSchema.safeParse({
        tasks_assigned: 2,
        tasks_completed: 1,
        details: 'งานทั่วไป',
        submission_link: 'invalid-url-string',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('4. Supervisor Task Rating Schema Validation', () => {
    const rateTaskSchema = z.object({
      task_id: z.string().min(1, 'ไม่ระบุรหัสงาน'),
      star_rating: z.number().min(1).max(5),
      supervisor_note: z.string().optional(),
    });

    it('Validates 1 to 5 star rating range', () => {
      expect(rateTaskSchema.safeParse({ task_id: 'task_01', star_rating: 1 }).success).toBe(true);
      expect(rateTaskSchema.safeParse({ task_id: 'task_01', star_rating: 5 }).success).toBe(true);
      expect(rateTaskSchema.safeParse({ task_id: 'task_01', star_rating: 0 }).success).toBe(false);
      expect(rateTaskSchema.safeParse({ task_id: 'task_01', star_rating: 6 }).success).toBe(false);
    });
  });

  describe('5. Leave Request Schema Validation', () => {
    const CreateLeaveSchema = z.object({
      leave_type: z.enum(['ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'ปฏิบัติงานที่ออฟฟิศ (Onsite)']),
      start_date: z.string().min(10),
      end_date: z.string().min(10),
      reason: z.string().min(3),
      attachment_url: z.string().optional(),
      attachment_name: z.string().optional(),
      attachment_type: z.enum(['image', 'pdf']).optional(),
    });

    it('Validates leave request with attachment', () => {
      const res = CreateLeaveSchema.safeParse({
        leave_type: 'ลาป่วย',
        start_date: '2026-10-10',
        end_date: '2026-10-10',
        reason: 'ปวดศีรษะ ไมเกรนกำเริบ',
        attachment_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
        attachment_name: 'cert.png',
        attachment_type: 'image',
      });
      expect(res.success).toBe(true);
    });

    it('Rejects invalid leave type', () => {
      const res = CreateLeaveSchema.safeParse({
        leave_type: 'ลาบวช',
        start_date: '2026-10-10',
        end_date: '2026-10-10',
        reason: 'ลางาน',
      });
      expect(res.success).toBe(false);
    });
  });
});

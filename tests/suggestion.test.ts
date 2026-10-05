import { describe, it, expect } from 'vitest';
import {
  createSuggestion,
  updateSuggestionStatus,
  getAllSuggestions,
  getSuggestionsForUser,
} from '@/lib/suggestionStore';

describe('Suggestion Box Store QA Suite', () => {
  it('1. Creates anonymous suggestion and sanitizes author details', () => {
    const anon = createSuggestion({
      topic: 'เสนอให้มีกาแฟฟรีในวันเข้าออฟฟิศ',
      category: 'สวัสดิการและสถานที่',
      content: 'อยากให้มีเครื่องชงกาแฟอัตโนมัติ',
      is_anonymous: true,
      employee_id: '1111',
      employee_name: 'สมชาย',
      department: 'IT',
    });

    expect(anon.id).toBeDefined();
    expect(anon.is_anonymous).toBe(true);
    expect(anon.employee_id).toBeNull();
    expect(anon.employee_name).toContain('Anonymous');
    expect(anon.department).toBeNull();
    expect(anon.status).toBe('New');
  });

  it('2. Creates non-anonymous suggestion and retains employee details', () => {
    const nonAnon = createSuggestion({
      topic: 'ขอจอภาพสำรองสำหรับ WFH',
      category: 'ระบบและอุปกรณ์',
      content: 'ต้องการจอต่อเพื่อทำงานเขียนโค้ดได้สะดวกขึ้น',
      is_anonymous: false,
      employee_id: '1205',
      employee_name: 'สมพร ปริญญา',
      department: 'Development',
    });

    expect(nonAnon.is_anonymous).toBe(false);
    expect(nonAnon.employee_id).toBe('1205');
    expect(nonAnon.employee_name).toBe('สมพร ปริญญา');
    expect(nonAnon.department).toBe('Development');
  });

  it('3. Updates suggestion status and appends admin response note', () => {
    const sug = createSuggestion({
      topic: 'ข้อเสนอแนะทดสอบ',
      category: 'การทำงาน WFH',
      content: 'เนื้อหาทดสอบ',
      is_anonymous: false,
    });

    const updated = updateSuggestionStatus({
      id: sug.id,
      status: 'Resolved',
      admin_note: 'ฝ่ายบริหารอนุมัติงบประมาณจัดซื้อเรียบร้อยแล้ว',
    });

    expect(updated?.status).toBe('Resolved');
    expect(updated?.admin_note).toContain('ฝ่ายบริหารอนุมัติ');
    expect(updated?.updated_at).not.toBeNull();
  });

  it('4. Filters suggestions for employee vs admin role', () => {
    const adminView = getSuggestionsForUser('9999', 'admin');
    expect(adminView.length).toBeGreaterThan(0);

    const empView = getSuggestionsForUser('1205', 'employee');
    // An employee only sees their own or resolved anonymous suggestions
    empView.forEach((s) => {
      const isOwner = s.employee_id === '1205';
      const isResolvedAnon = s.is_anonymous && s.status === 'Resolved';
      expect(isOwner || isResolvedAnon).toBe(true);
    });
  });
});

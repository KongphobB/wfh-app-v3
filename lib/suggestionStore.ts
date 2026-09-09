import { SuggestionItem, SuggestionCategory, SuggestionStatus } from '@/types';

// In-memory persistent suggestion store attached to global
const globalSuggestions = (global as any).__memorySuggestions || [
  {
    id: 'sug_1787530001_demo1',
    topic: 'อยากให้เพิ่มระบบบันทึกเวลาพักเที่ยงและกล่องรับฟังความคิดเห็น',
    category: 'การทำงาน WFH',
    content: 'เสนอให้มีแถบแจ้งเตือนเวลาพักเที่ยง 12:00 - 13:00 น. เพื่อให้พนักงานพักผ่อนได้สบายใจ และมีกล่องส่งไอเดียปรับปรุงระบบ',
    is_anonymous: true,
    employee_id: null,
    employee_name: 'ไม่ประสงค์ออกนาม (Anonymous)',
    department: null,
    status: 'Resolved',
    admin_note: 'ดำเนินการเพิ่มแถบพักเที่ยง 12:00 - 13:00 น. และระบบกล่องข้อเสนอแนะเรียบร้อยแล้ว ขอบคุณสำหรับไอเดียครับ',
    created_at: '2026-08-22T10:30:00+07:00',
    updated_at: '2026-08-24T09:00:00+07:00',
  },
  {
    id: 'sug_1787530002_demo2',
    topic: 'ขอเสนอปรับความคมชัดของโหมดมืด (Dark Mode) ในบางเมนู',
    category: 'ระบบและอุปกรณ์',
    content: 'อยากให้ตัวหนังสือสีขาวบนพื้นหลังสีเข้มในหน้าสถิติตัดกันชัดเจนยิ่งขึ้นครับ',
    is_anonymous: false,
    employee_id: '1304',
    employee_name: 'ก้องภพ บุญชู',
    department: 'Project',
    status: 'In Progress',
    admin_note: 'ทีมพัฒนาได้รับเรื่องและกำลังปรับปรุงโทนสี Contrast ครับ',
    created_at: '2026-08-23T14:15:00+07:00',
    updated_at: '2026-08-24T08:30:00+07:00',
  },
];

(global as any).__memorySuggestions = globalSuggestions;

export function getAllSuggestions(): SuggestionItem[] {
  return (global as any).__memorySuggestions;
}

export function getSuggestionsForUser(employeeId: string, role?: string): SuggestionItem[] {
  const suggestions: SuggestionItem[] = (global as any).__memorySuggestions;
  if (role === 'admin' || role === 'supervisor') {
    return suggestions;
  }
  // Regular employees only see their own non-anonymous submissions or general resolution logs
  return suggestions.filter(
    (s) => s.employee_id === employeeId || (s.is_anonymous && s.status === 'Resolved')
  );
}

export function createSuggestion(params: {
  topic: string;
  category: SuggestionCategory;
  content: string;
  is_anonymous: boolean;
  employee_id?: string;
  employee_name?: string;
  department?: string | null;
}): SuggestionItem {
  const isAnon = Boolean(params.is_anonymous);
  const newSuggestion: SuggestionItem = {
    id: `sug_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    topic: params.topic.trim(),
    category: params.category,
    content: params.content.trim(),
    is_anonymous: isAnon,
    employee_id: isAnon ? null : params.employee_id || null,
    employee_name: isAnon ? 'ไม่ประสงค์ออกนาม (Anonymous)' : params.employee_name || 'พนักงาน',
    department: isAnon ? null : params.department || null,
    status: 'New',
    admin_note: null,
    created_at: new Date().toISOString(),
    updated_at: null,
  };

  (global as any).__memorySuggestions.unshift(newSuggestion);
  return newSuggestion;
}

export function updateSuggestionStatus(params: {
  id: string;
  status: SuggestionStatus;
  admin_note?: string | null;
}): SuggestionItem | null {
  const suggestions: SuggestionItem[] = (global as any).__memorySuggestions;
  const idx = suggestions.findIndex((s) => s.id === params.id);
  if (idx === -1) return null;

  suggestions[idx].status = params.status;
  if (params.admin_note !== undefined) {
    suggestions[idx].admin_note = params.admin_note;
  }
  suggestions[idx].updated_at = new Date().toISOString();

  return suggestions[idx];
}

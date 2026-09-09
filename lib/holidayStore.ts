import { CompanyHoliday, HolidayPolicyDoc } from '@/types';

// Official Holidays from SNU Supply and Service Co., Ltd. (ประกาศบริษัท ที่ 005/2568)
const snuHolidays2026: CompanyHoliday[] = [
  { id: 'snu_hol_01', date: '2026-01-01', name: 'วันขึ้นปีใหม่', name_en: "New Year's Day", type: 'official', is_active: true },
  { id: 'snu_hol_02', date: '2026-01-02', name: 'วันหยุดชดเชยเนื่องในวันขึ้นปีใหม่', name_en: "New Year's Eve Substitution", type: 'official', is_active: true },
  { id: 'snu_hol_03', date: '2026-03-03', name: 'วันมาฆบูชา', name_en: 'Makha Bucha Day', type: 'official', is_active: true },
  { id: 'snu_hol_04', date: '2026-04-13', name: 'วันสงกรานต์', name_en: 'Songkran Festival', type: 'official', is_active: true },
  { id: 'snu_hol_05', date: '2026-04-14', name: 'วันสงกรานต์', name_en: 'Songkran Festival', type: 'official', is_active: true },
  { id: 'snu_hol_06', date: '2026-04-15', name: 'วันสงกรานต์', name_en: 'Songkran Festival', type: 'official', is_active: true },
  { id: 'snu_hol_07', date: '2026-05-01', name: 'วันแรงงานแห่งชาติ', name_en: 'National Labour Day', type: 'official', is_active: true },
  { id: 'snu_hol_08', date: '2026-06-01', name: 'วันหยุดชดเชยวันวิสาขบูชา (วันอาทิตย์ที่ 31 พฤษภาคม 2569)', name_en: 'Visakha Bucha Day Substitution', type: 'official', is_active: true },
  { id: 'snu_hol_09', date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี', name_en: "HM Queen Suthida's Birthday", type: 'official', is_active: true },
  { id: 'snu_hol_10', date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัวมหาวชิราลงกรณฯ', name_en: "HM King Maha Vajiralongkorn's Birthday", type: 'official', is_active: true },
  { id: 'snu_hol_11', date: '2026-08-12', name: 'วันแม่แห่งชาติ', name_en: "HM Queen Sirikit's Birthday / Mother's Day", type: 'official', is_active: true },
  { id: 'snu_hol_12', date: '2026-10-13', name: 'วันนวมินทรมหาราช หรือ วันคล้ายวันสวรรคต รัชกาลที่ 9', name_en: 'King Bhumibol Adulyadej The Great Memorial Day', type: 'official', is_active: true },
  { id: 'snu_hol_13', date: '2026-10-23', name: 'วันปิยมหาราช', name_en: 'Chulalongkorn Memorial Day', type: 'official', is_active: true },
  { id: 'snu_hol_14', date: '2026-12-07', name: 'วันคล้ายวันพระบรมราชสมภพ รัชกาลที่ 9 และวันพ่อแห่งชาติ (วันอาทิตย์ที่ 5 ธันวาคม 2569)', name_en: "King Bhumibol Adulyadej's Birthday / Father's Day Substitution", type: 'official', is_active: true },
  { id: 'snu_hol_15', date: '2026-12-31', name: 'วันสิ้นปี', name_en: "New Year's Eve", type: 'official', is_active: true },
];

const snuPolicyDoc: HolidayPolicyDoc = {
  file_name: 'ประกาศบริษัท_005-2568_วันหยุดนักขัตฤกษ์ประจำปี2569_SNU.png',
  file_url: '/docs/snu_holidays_2026.png',
  file_type: 'image',
  file_size: '680 KB',
  uploaded_at: '2025-12-01T09:00:00+07:00',
  uploaded_by: 'SNU Supply and Service Co., Ltd. (Managing Director)',
};

// Initialize global storage for memory persistence across reloads
(global as any).__memoryHolidays = [...snuHolidays2026];
(global as any).__memoryHolidayPolicy = { ...snuPolicyDoc };

export function getAllHolidays(): CompanyHoliday[] {
  const holidays: CompanyHoliday[] = (global as any).__memoryHolidays || snuHolidays2026;
  return [...holidays].sort((a, b) => a.date.localeCompare(b.date));
}

export function getHolidayPolicyDoc(): HolidayPolicyDoc | null {
  return (global as any).__memoryHolidayPolicy || snuPolicyDoc;
}

export function addCustomHoliday(params: {
  date: string;
  name: string;
  name_en?: string;
  notes?: string;
}): CompanyHoliday {
  const holidays: CompanyHoliday[] = (global as any).__memoryHolidays;
  const newHol: CompanyHoliday = {
    id: `snu_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: params.date,
    name: params.name.trim(),
    name_en: params.name_en?.trim() || undefined,
    type: 'company',
    is_active: true,
    notes: params.notes?.trim() || undefined,
  };

  holidays.push(newHol);
  return newHol;
}

export function updateHoliday(params: {
  id: string;
  name?: string;
  name_en?: string;
  date?: string;
  is_active?: boolean;
  notes?: string;
}): CompanyHoliday | null {
  const holidays: CompanyHoliday[] = (global as any).__memoryHolidays;
  const idx = holidays.findIndex((h) => h.id === params.id);
  if (idx === -1) return null;

  if (params.name !== undefined) holidays[idx].name = params.name.trim();
  if (params.name_en !== undefined) holidays[idx].name_en = params.name_en.trim();
  if (params.date !== undefined) holidays[idx].date = params.date;
  if (params.is_active !== undefined) holidays[idx].is_active = params.is_active;
  if (params.notes !== undefined) holidays[idx].notes = params.notes?.trim() || undefined;

  return holidays[idx];
}

export function deleteHoliday(id: string): boolean {
  const holidays: CompanyHoliday[] = (global as any).__memoryHolidays;
  const idx = holidays.findIndex((h) => h.id === id);
  if (idx === -1) return false;
  holidays.splice(idx, 1);
  return true;
}

export function updateHolidayPolicyDoc(doc: HolidayPolicyDoc | null): HolidayPolicyDoc | null {
  (global as any).__memoryHolidayPolicy = doc;
  return doc;
}

import fs from 'fs';
import os from 'os';
import path from 'path';
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

interface PersistedHolidayData {
  holidays: CompanyHoliday[];
  policyDoc: HolidayPolicyDoc | null;
}

const isTestEnv = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test');
const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'company_holidays.json');
const TMP_STORE_FILE = '/tmp/company_holidays.json';
const TEST_STORE_FILE = path.join(os.tmpdir(), `wfh_test_${process.pid}_company_holidays.json`);

function getStoragePath(): string {
  if (isTestEnv) return TEST_STORE_FILE;
  if (process.env.VERCEL) return TMP_STORE_FILE;
  return LOCAL_STORE_FILE;
}

function ensureDir(filePath: string) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {}
}

function loadFromDisk(): PersistedHolidayData {
  if (isTestEnv) {
    try {
      if (fs.existsSync(TEST_STORE_FILE)) {
        const content = fs.readFileSync(TEST_STORE_FILE, 'utf-8');
        if (content && content.trim()) {
          const parsed = JSON.parse(content);
          if (parsed && Array.isArray(parsed.holidays)) {
            return {
              holidays: parsed.holidays,
              policyDoc: parsed.policyDoc !== undefined ? parsed.policyDoc : { ...snuPolicyDoc },
            };
          }
        }
      }
    } catch {}
    return { holidays: [...snuHolidays2026], policyDoc: { ...snuPolicyDoc } };
  }

  if (process.env.VERCEL && fs.existsSync(TMP_STORE_FILE)) {
    try {
      const content = fs.readFileSync(TMP_STORE_FILE, 'utf-8');
      if (content && content.trim()) {
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.holidays)) {
          return {
            holidays: parsed.holidays,
            policyDoc: parsed.policyDoc !== undefined ? parsed.policyDoc : { ...snuPolicyDoc },
          };
        }
      }
    } catch {}
  }

  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      if (content && content.trim()) {
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.holidays)) {
          return {
            holidays: parsed.holidays,
            policyDoc: parsed.policyDoc !== undefined ? parsed.policyDoc : { ...snuPolicyDoc },
          };
        }
      }
    }
  } catch {}

  return { holidays: [...snuHolidays2026], policyDoc: { ...snuPolicyDoc } };
}

function saveToDisk() {
  const filePath = getStoragePath();
  try {
    ensureDir(filePath);
    const payload: PersistedHolidayData = {
      holidays: (global as any).__memoryHolidays || snuHolidays2026,
      policyDoc: (global as any).__memoryHolidayPolicy ?? snuPolicyDoc,
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save company holidays to disk:', err);
  }
}

// Initialize global storage for memory persistence across reloads
if (!(global as any).__memoryHolidays || !(global as any).__memoryHolidayPolicyInitialized) {
  const initial = loadFromDisk();
  (global as any).__memoryHolidays = initial.holidays;
  (global as any).__memoryHolidayPolicy = initial.policyDoc;
  (global as any).__memoryHolidayPolicyInitialized = true;
}

export function getAllHolidays(): CompanyHoliday[] {
  const holidays: CompanyHoliday[] = (global as any).__memoryHolidays || snuHolidays2026;
  return [...holidays].sort((a, b) => a.date.localeCompare(b.date));
}

export function getHolidayPolicyDoc(): HolidayPolicyDoc | null {
  return (global as any).__memoryHolidayPolicy !== undefined
    ? (global as any).__memoryHolidayPolicy
    : snuPolicyDoc;
}

export function isHolidayDate(dateStr: string): boolean {
  const holidays: CompanyHoliday[] = (global as any).__memoryHolidays || snuHolidays2026;
  return holidays.some((h) => h.is_active && h.date === dateStr);
}

export function getHolidayByDate(dateStr: string): CompanyHoliday | null {
  const holidays: CompanyHoliday[] = (global as any).__memoryHolidays || snuHolidays2026;
  return holidays.find((h) => h.is_active && h.date === dateStr) || null;
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
  saveToDisk();
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

  saveToDisk();
  return holidays[idx];
}

export function deleteHoliday(id: string): boolean {
  const holidays: CompanyHoliday[] = (global as any).__memoryHolidays;
  const idx = holidays.findIndex((h) => h.id === id);
  if (idx === -1) return false;
  holidays.splice(idx, 1);
  saveToDisk();
  return true;
}

export function updateHolidayPolicyDoc(doc: HolidayPolicyDoc | null): HolidayPolicyDoc | null {
  (global as any).__memoryHolidayPolicy = doc;
  saveToDisk();
  return doc;
}

import fs from 'fs';
import os from 'os';
import path from 'path';

export interface WeeklyScheduleEntry {
  employee_id: string;
  days: number[]; // 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri
  updated_at: string;
  updated_by: string;
}

declare global {
  var __weeklyScheduleStore: Map<string, number[]> | undefined;
}

const isTestEnv = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test');
const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'wfh_weekly_schedules.json');
const TMP_STORE_FILE = '/tmp/wfh_weekly_schedules.json';
const TEST_STORE_FILE = path.join(os.tmpdir(), `wfh_test_${process.pid}_weekly_schedules.json`);

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

function loadFromDisk(): Record<string, number[]> {
  if (isTestEnv && fs.existsSync(TEST_STORE_FILE)) {
    try {
      const content = fs.readFileSync(TEST_STORE_FILE, 'utf-8');
      if (content && content.trim()) {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
  }

  let baseSchedules: Record<string, number[]> = {};

  // 1. Read bundled repository file as baseline
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      if (content && content.trim()) {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          baseSchedules = { ...parsed };
        }
      }
    }
  } catch {}

  // 2. If running on Vercel and /tmp file exists, merge /tmp overrides on top
  if (process.env.VERCEL && fs.existsSync(TMP_STORE_FILE)) {
    try {
      const content = fs.readFileSync(TMP_STORE_FILE, 'utf-8');
      if (content && content.trim()) {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          baseSchedules = { ...baseSchedules, ...parsed };
        }
      }
    } catch {}
  }

  if (Object.keys(baseSchedules).length > 0) {
    return baseSchedules;
  }

  if (global.__weeklyScheduleStore) {
    const obj: Record<string, number[]> = {};
    global.__weeklyScheduleStore.forEach((dList, id) => {
      obj[id] = dList;
    });
    return obj;
  }

  return {};
}

function saveToDisk(data: Record<string, number[]>) {
  const filePath = getStoragePath();
  try {
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save weekly schedules to disk:', err);
  }
}

function getMemoryStore(): Map<string, number[]> {
  if (!global.__weeklyScheduleStore) {
    const map = new Map<string, number[]>();
    const diskRecords = loadFromDisk();
    Object.entries(diskRecords).forEach(([empId, days]) => {
      if (Array.isArray(days)) {
        map.set(empId, days);
      }
    });
    global.__weeklyScheduleStore = map;
  }
  return global.__weeklyScheduleStore;
}

const bangkokWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Bangkok',
  weekday: 'short',
});

const dayOfWeekCache = new Map<string, number>();

/**
 * แปลงวันที่หรือวันปัจจุบันเป็นวันในสัปดาห์ตามเวลาประเทศไทย (Bangkok GMT+7)
 * 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, 0 = Sun
 */
export function getBangkokDayOfWeek(dateStr?: string): number {
  if (dateStr) {
    const cached = dayOfWeekCache.get(dateStr);
    if (cached !== undefined) return cached;
  }

  const date = dateStr ? new Date(`${dateStr}T12:00:00+07:00`) : new Date();
  const dayStr = bangkokWeekdayFormatter.format(date);

  let dayNum = -1;
  switch (dayStr) {
    case 'Mon': dayNum = 1; break;
    case 'Tue': dayNum = 2; break;
    case 'Wed': dayNum = 3; break;
    case 'Thu': dayNum = 4; break;
    case 'Fri': dayNum = 5; break;
    case 'Sat': dayNum = 6; break;
    case 'Sun': dayNum = 0; break;
  }

  if (dateStr && dayNum !== -1) {
    if (dayOfWeekCache.size > 400) {
      dayOfWeekCache.clear();
    }
    dayOfWeekCache.set(dateStr, dayNum);
  }
  return dayNum;
}

/**
 * ดึงวัน WFH ประจำสัปดาห์ของพนักงาน
 */
export function getEmployeeWeeklySchedule(employeeId: string): number[] {
  const store = getMemoryStore();
  return store.get(employeeId) || [];
}

/**
 * ตั้งค่าวัน WFH ประจำสัปดาห์ของพนักงาน
 * days: [1, 2, 3, 4, 5] (1=จันทร์, 2=อังคาร, 3=พุธ, 4=พฤหัส, 5=ศุกร์)
 */
export function setEmployeeWeeklySchedule(
  employeeId: string,
  days: number[]
): number[] {
  const store = getMemoryStore();
  const validDays = Array.from(new Set(days.filter((d) => d >= 1 && d <= 5))).sort();
  
  if (validDays.length === 0) {
    store.delete(employeeId);
  } else {
    store.set(employeeId, validDays);
  }

  // Save to disk
  const obj: Record<string, number[]> = {};
  store.forEach((dList, id) => {
    obj[id] = dList;
  });
  saveToDisk(obj);

  return validDays;
}

/**
 * ดึงตาราง WFH ทั้งหมด
 */
export function getAllWeeklySchedules(): Record<string, number[]> {
  const store = getMemoryStore();
  const obj: Record<string, number[]> = {};
  store.forEach((dList, id) => {
    obj[id] = dList;
  });
  return obj;
}

/**
 * ตรวจสอบว่าพนักงานมีตาราง WFH ประจำสัปดาห์ในวันที่ระบุหรือไม่
 */
export function isEmployeeScheduledWfhToday(employeeId: string, dateStr?: string): boolean {
  const dayOfWeek = getBangkokDayOfWeek(dateStr);
  if (dayOfWeek < 1 || dayOfWeek > 5) {
    return false; // ไม่รวมเสาร์-อาทิตย์
  }

  const days = getEmployeeWeeklySchedule(employeeId);
  return days.includes(dayOfWeek);
}

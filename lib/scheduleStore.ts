import fs from 'fs';
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

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'wfh_weekly_schedules.json');
const TMP_STORE_FILE = '/tmp/wfh_weekly_schedules.json';

function getStoragePath(): string {
  if (process.env.VERCEL) {
    return TMP_STORE_FILE;
  }
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
  // 1. If running on Vercel and /tmp file exists, read /tmp first
  if (process.env.VERCEL && fs.existsSync(TMP_STORE_FILE)) {
    try {
      const content = fs.readFileSync(TMP_STORE_FILE, 'utf-8');
      if (content && content.trim()) {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
  }

  // 2. Fall back to bundled repository file
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      if (content && content.trim()) {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    }
  } catch {}

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
  const filePath = process.env.VERCEL ? TMP_STORE_FILE : LOCAL_STORE_FILE;
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

/**
 * แปลงวันที่หรือวันปัจจุบันเป็นวันในสัปดาห์ตามเวลาประเทศไทย (Bangkok GMT+7)
 * 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, 0 = Sun
 */
export function getBangkokDayOfWeek(dateStr?: string): number {
  const date = dateStr ? new Date(`${dateStr}T12:00:00+07:00`) : new Date();
  const dayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
  }).format(date);

  switch (dayStr) {
    case 'Mon': return 1;
    case 'Tue': return 2;
    case 'Wed': return 3;
    case 'Thu': return 4;
    case 'Fri': return 5;
    case 'Sat': return 6;
    case 'Sun': return 0;
    default: return -1;
  }
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

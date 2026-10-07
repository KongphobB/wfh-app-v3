import fs from 'fs';
import path from 'path';
import { getThaiDateStr } from './timeSync';
import { createLeaveRequest, getAllLeaveRequests, updateLeaveStatus } from './leaveStore';

export type WorkLocationMode = 'office' | 'wfh';

export interface DailyLocationRecord {
  id: string; // `${date}_${employee_id}`
  date: string;
  employee_id: string;
  location: WorkLocationMode;
  updated_by?: string;
  updated_at: string;
}

declare global {
  var __dailyLocationStore: Map<string, DailyLocationRecord> | undefined;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'daily_work_locations.json');
const TMP_STORE_FILE = '/tmp/daily_work_locations.json';

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

function loadFromDisk(): DailyLocationRecord[] {
  const filePath = getStoragePath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        return list;
      }
    }
  } catch (err) {
    console.warn('Failed to read daily work locations from disk:', err);
  }
  return [];
}

function saveToDisk(records: DailyLocationRecord[]) {
  const filePath = getStoragePath();
  try {
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save daily work locations to disk:', err);
  }
}

function getMemoryStore(): Map<string, DailyLocationRecord> {
  if (!global.__dailyLocationStore) {
    const map = new Map<string, DailyLocationRecord>();
    const diskRecords = loadFromDisk();
    diskRecords.forEach((r) => map.set(r.id, r));
    global.__dailyLocationStore = map;
  }
  return global.__dailyLocationStore;
}

export function getDailyWorkLocation(employeeId: string, dateStr?: string): WorkLocationMode {
  const date = dateStr || getThaiDateStr();
  const id = `${date}_${employeeId}`;
  const store = getMemoryStore();

  const record = store.get(id);
  if (record) {
    return record.location;
  }

  // Also check if employee has an approved onsite leave request for this date
  const leaves = getAllLeaveRequests();
  const hasOnsiteLeave = leaves.some(
    (l) =>
      l.employee_id === employeeId &&
      l.status === 'Approved' &&
      l.leave_type === 'ปฏิบัติงานที่ออฟฟิศ (Onsite)' &&
      l.start_date <= date &&
      date <= l.end_date
  );

  if (hasOnsiteLeave) {
    return 'office';
  }

  return 'wfh';
}

export function setDailyWorkLocation(
  employeeId: string,
  location: WorkLocationMode,
  employeeName?: string,
  updatedBy?: string,
  dateStr?: string
): DailyLocationRecord {
  const date = dateStr || getThaiDateStr();
  const id = `${date}_${employeeId}`;
  const store = getMemoryStore();

  const record: DailyLocationRecord = {
    id,
    date,
    employee_id: employeeId,
    location,
    updated_by: updatedBy || 'Admin',
    updated_at: new Date().toISOString(),
  };

  store.set(id, record);
  saveToDisk(Array.from(store.values()));

  // Sync with leaveStore:
  // If set to office, ensure there is an approved onsite record
  const leaves = getAllLeaveRequests();
  const existingOnsite = leaves.find(
    (l) =>
      l.employee_id === employeeId &&
      l.start_date <= date &&
      date <= l.end_date &&
      l.leave_type === 'ปฏิบัติงานที่ออฟฟิศ (Onsite)'
  );

  if (location === 'office') {
    if (!existingOnsite) {
      createLeaveRequest({
        employee_id: employeeId,
        employee_name: employeeName || employeeId,
        leave_type: 'ปฏิบัติงานที่ออฟฟิศ (Onsite)',
        start_date: date,
        end_date: date,
        reason: `แอดมิน (${updatedBy || 'Admin'}) กำหนดสถานที่ทำงานเป็น เข้า Office`,
      });
    } else if (existingOnsite.status !== 'Approved') {
      updateLeaveStatus({
        id: existingOnsite.id,
        status: 'Approved',
        reviewed_by: updatedBy || 'Admin',
        review_note: 'อนุมัติโดย Admin ผ่านปุ่มสถานที่ทำงาน',
      });
    }
  } else if (location === 'wfh') {
    // If set to wfh and there was an admin-generated onsite request for today, remove it
    if (existingOnsite && existingOnsite.reason?.includes('แอดมิน')) {
      const idx = leaves.findIndex((l) => l.id === existingOnsite.id);
      if (idx !== -1) {
        leaves.splice(idx, 1);
      }
    }
  }

  return record;
}

export function isEmployeeAtOfficeToday(employeeId: string, dateStr?: string): boolean {
  return getDailyWorkLocation(employeeId, dateStr) === 'office';
}

export function getAllDailyWorkLocations(dateStr?: string): Record<string, WorkLocationMode> {
  const date = dateStr || getThaiDateStr();
  const store = getMemoryStore();
  const result: Record<string, WorkLocationMode> = {};

  store.forEach((rec) => {
    if (rec.date === date) {
      result[rec.employee_id] = rec.location;
    }
  });

  return result;
}

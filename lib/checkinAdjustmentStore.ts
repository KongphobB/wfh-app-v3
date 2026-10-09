import fs from 'fs';
import path from 'path';

export interface CheckinAdjustment {
  id: string; // `${date}_${employee_id}`
  date: string;
  employee_id: string;
  time?: string; // '07:50:51'
  verification_status?: string; // 'ตรงเวลา'
  note?: string; // ''
  original_time?: string; // '09:15:32'
  remove_duplicate_employee_id?: string; // '9999'
  reason?: string;
  updated_at: string;
  updated_by: string;
}

declare global {
  var __checkinAdjustmentStore: Map<string, CheckinAdjustment> | undefined;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'checkin_adjustments.json');
const TMP_STORE_FILE = '/tmp/checkin_adjustments.json';

function ensureDir(filePath: string) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {}
}

function loadFromDisk(): CheckinAdjustment[] {
  // 1. If running on Vercel and /tmp file exists, read /tmp first
  if (process.env.VERCEL && fs.existsSync(TMP_STORE_FILE)) {
    try {
      const content = fs.readFileSync(TMP_STORE_FILE, 'utf-8');
      if (content && content.trim()) {
        const list = JSON.parse(content);
        if (Array.isArray(list)) return list;
      }
    } catch {}
  }

  // 2. Fall back to bundled repository file
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      if (content && content.trim()) {
        const list = JSON.parse(content);
        if (Array.isArray(list)) return list;
      }
    }
  } catch {}

  if (global.__checkinAdjustmentStore) {
    return Array.from(global.__checkinAdjustmentStore.values());
  }

  return [];
}

function saveToDisk(records: CheckinAdjustment[]) {
  const filePath = process.env.VERCEL ? TMP_STORE_FILE : LOCAL_STORE_FILE;
  try {
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save checkin adjustments to disk:', err);
  }
}

function getMemoryStore(): Map<string, CheckinAdjustment> {
  if (!global.__checkinAdjustmentStore) {
    const map = new Map<string, CheckinAdjustment>();
    const diskRecords = loadFromDisk();
    diskRecords.forEach((r) => map.set(r.id, r));
    global.__checkinAdjustmentStore = map;
  }
  return global.__checkinAdjustmentStore;
}

export function getAllCheckinAdjustments(): CheckinAdjustment[] {
  const store = getMemoryStore();
  return Array.from(store.values());
}

export function addCheckinAdjustment(adj: CheckinAdjustment) {
  const store = getMemoryStore();
  store.set(adj.id, adj);
  saveToDisk(Array.from(store.values()));
}

export function applyCheckinAdjustments<T extends Record<string, any>>(logs: T[]): T[] {
  if (!Array.isArray(logs) || logs.length === 0) return logs;
  const adjustments = getAllCheckinAdjustments();
  if (adjustments.length === 0) return logs;

  return logs
    .filter((log) => {
      const logEmpId = String(log.employeeId || log.employee_id || '');
      const logDate = String(log.date || log.log_date || '');
      const logType = String(log.type || log.log_type || '');

      // Check if this log should be excluded (e.g. accidental check-in on admin account 9999)
      const shouldRemove = adjustments.some(
        (adj) =>
          adj.date === logDate &&
          adj.remove_duplicate_employee_id === logEmpId &&
          logType === 'เข้างาน'
      );
      return !shouldRemove;
    })
    .map((log) => {
      const logEmpId = String(log.employeeId || log.employee_id || '');
      const logDate = String(log.date || log.log_date || '');
      const logType = String(log.type || log.log_type || '');

      if (logType === 'เข้างาน') {
        const adj = adjustments.find((a) => a.date === logDate && a.employee_id === logEmpId);
        if (adj) {
          const updated: any = { ...log };
          if (adj.time) {
            updated.time = adj.time;
            if (updated.log_time) {
              updated.log_time = `${logDate}T${adj.time}+07:00`;
            }
          }
          if (adj.verification_status) {
            updated.verificationStatus = adj.verification_status;
            updated.verification_status = adj.verification_status;
          }
          if (adj.note !== undefined) {
            updated.note = adj.note;
          }
          return updated as T;
        }
      }
      return log;
    });
}

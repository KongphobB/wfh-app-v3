import fs from 'fs';
import path from 'path';
import { SpotCheck } from '@/types';
import { getThaiDateStr } from './timeSync';

declare global {
  var __manualSpotChecks: SpotCheck[] | undefined;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'manual_spotchecks.json');
const TMP_STORE_FILE = '/tmp/manual_spotchecks.json';

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

function loadChecksFromDisk(): SpotCheck[] {
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
    console.warn('Failed to read manual spot checks from disk:', err);
  }
  return [];
}

function saveChecksToDisk(checks: SpotCheck[]) {
  const filePath = getStoragePath();
  try {
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(checks, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write manual spot checks to disk:', err);
  }
}

function getMemoryStore(): SpotCheck[] {
  const diskChecks = loadChecksFromDisk();
  const memChecks = global.__manualSpotChecks || [];

  const map = new Map<string, SpotCheck>();
  diskChecks.forEach((c) => map.set(c.id, c));
  memChecks.forEach((c) => {
    map.set(c.id, c);
  });

  const merged = Array.from(map.values());
  global.__manualSpotChecks = merged;
  return merged;
}

export function addManualSpotCheck(check: SpotCheck): SpotCheck {
  const store = getMemoryStore();
  // Filter out any older pending checks for the same employee
  const updated = [
    check,
    ...store.filter(
      (c) => !(c.employee_id === check.employee_id && (c.result_status === 'Scheduled' || c.result_status === 'Pending'))
    ),
  ];
  global.__manualSpotChecks = updated;
  saveChecksToDisk(updated);

  return check;
}

/**
 * Add manual spot check asynchronously
 */
export async function addManualSpotCheckAsync(check: SpotCheck): Promise<SpotCheck> {
  return addManualSpotCheck(check);
}

export function getActiveManualSpotChecks(employeeId?: string): SpotCheck[] {
  const store = getMemoryStore();
  const nowMs = Date.now();
  const todayStr = getThaiDateStr();

  return store.filter((c) => {
    if (employeeId && String(c.employee_id) !== String(employeeId)) return false;
    if (c.check_date !== todayStr) return false;

    // If completed (Pass or Fail or scanned), it is NEVER active!
    const isCompleted = c.result_status === 'Pass' || c.result_status === 'Fail' || Boolean(c.actual_scan_time);
    if (isCompleted) return false;

    // Active pending check: not expired (created within 11 minutes)
    const createdMs = c.created_at ? new Date(c.created_at).getTime() : 0;
    if (createdMs > 0 && nowMs <= createdMs + 11 * 60 * 1000) {
      return true;
    }

    return false;
  });
}

/**
 * Asynchronously retrieve active manual spot checks
 */
export async function getActiveManualSpotChecksAsync(employeeId?: string): Promise<SpotCheck[]> {
  return getActiveManualSpotChecks(employeeId);
}

export function updateManualSpotCheck(id: string, updates: Partial<SpotCheck>): SpotCheck | null {
  const store = getMemoryStore();
  let found: SpotCheck | null = null;

  const updated = store.map((c) => {
    if (c.id === id) {
      found = { ...c, ...updates };
      return found;
    }
    return c;
  });

  global.__manualSpotChecks = updated;
  saveChecksToDisk(updated);
  return found;
}

import fs from 'fs';
import os from 'os';
import path from 'path';
import { callGAS } from './gas';

const isTestEnv = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test');
const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_EXEMPT_FILE = path.join(DATA_DIR, 'photo_exempt_employees.json');
const TMP_EXEMPT_FILE = '/tmp/photo_exempt_employees.json';
const TEST_EXEMPT_FILE = path.join(os.tmpdir(), `wfh_test_${process.pid}_photo_exempt.json`);

function getStoragePath(): string {
  if (isTestEnv) return TEST_EXEMPT_FILE;
  if (process.env.VERCEL) return TMP_EXEMPT_FILE;
  return LOCAL_EXEMPT_FILE;
}

function ensureDir(filePath: string) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {}
}

export const DEFAULT_EXEMPT_POSITIONS =
  'Senior, Manager, ซีเนียร์, ผู้จัดการ, ผจก, ผจก., หัวหน้า, Leader, Supervisor, Admin, Executive';

let cachedExemptConfig: {
  config: {
    exemptKeywords: string[];
    exemptEmployeeIds: Set<string>;
    exemptForceOffIds: Set<string>;
    autoExemptSupervisors: boolean;
  };
  expiresAt: number;
} | null = null;

let memoryExemptIds: Set<string> | null = null;

export function getLocalExemptIds(): Set<string> {
  if (memoryExemptIds) {
    return new Set(memoryExemptIds);
  }
  const filePath = getStoragePath();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        const set = new Set(list.map(String));
        memoryExemptIds = new Set(set);
        return set;
      }
    }
    if (!isTestEnv && process.env.VERCEL && fs.existsSync(LOCAL_EXEMPT_FILE)) {
      const data = fs.readFileSync(LOCAL_EXEMPT_FILE, 'utf-8');
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        const set = new Set(list.map(String));
        memoryExemptIds = new Set(set);
        return set;
      }
    }
  } catch (err) {
    console.warn('Error reading local exempt file:', err);
  }
  memoryExemptIds = new Set<string>();
  return new Set<string>();
}

export function invalidateExemptConfigCache(): void {
  cachedExemptConfig = null;
}

export function saveLocalExemptIds(ids: Set<string>): void {
  const filePath = getStoragePath();
  cachedExemptConfig = null; // Invalidate memory cache when local exempt IDs change
  memoryExemptIds = new Set(ids);
  try {
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(Array.from(ids), null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving local exempt file:', err);
  }
}

export async function getExemptConfig(): Promise<{
  exemptKeywords: string[];
  exemptEmployeeIds: Set<string>;
  exemptForceOffIds: Set<string>;
  autoExemptSupervisors: boolean;
}> {
  if (cachedExemptConfig && Date.now() < cachedExemptConfig.expiresAt) {
    return cachedExemptConfig.config;
  }

  const localExemptIds = getLocalExemptIds();
  const exemptForceOffIds = new Set<string>();
  const mergedExemptIds = new Set<string>();
  let localAutoSupOff = false;

  localExemptIds.forEach((token) => {
    const trimmed = String(token).trim();
    if (!trimmed) return;
    if (trimmed === '__AUTO_SUP_OFF__') {
      localAutoSupOff = true;
    } else if (trimmed.toUpperCase().startsWith('OFF:')) {
      const offId = trimmed.slice(4).trim();
      if (offId) exemptForceOffIds.add(offId);
    } else {
      mergedExemptIds.add(trimmed.replace(/^ID:/i, '').trim());
    }
  });

  try {
    const configRes = await callGAS('getSystemConfig');
    const cfg = configRes?.config || {};
    const rawList = String(cfg.photo_exempt_positions || DEFAULT_EXEMPT_POSITIONS)
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean);

    const exemptKeywords: string[] = [];
    let gasAutoSupOff = false;

    rawList.forEach((item) => {
      if (item === '__AUTO_SUP_OFF__') {
        gasAutoSupOff = true;
      } else if (item.toUpperCase().startsWith('OFF:')) {
        const offId = item.slice(4).trim();
        if (offId && !mergedExemptIds.has(offId)) {
          exemptForceOffIds.add(offId);
        }
      } else if (/^\d+$/.test(item) || item.startsWith('ID:')) {
        const onId = item.replace(/^ID:/i, '').trim();
        if (onId && !exemptForceOffIds.has(onId)) {
          mergedExemptIds.add(onId);
        }
      } else {
        exemptKeywords.push(item.toLowerCase());
      }
    });

    const autoExemptSupervisors =
      localAutoSupOff || gasAutoSupOff
        ? false
        : cfg.auto_exempt_supervisors !== undefined
          ? String(cfg.auto_exempt_supervisors).toLowerCase() !== 'false'
          : true;

    const result = {
      exemptKeywords,
      exemptEmployeeIds: mergedExemptIds,
      exemptForceOffIds,
      autoExemptSupervisors,
    };
    cachedExemptConfig = { config: result, expiresAt: Date.now() + 300000 };
    return result;
  } catch {
    const fallback = {
      exemptKeywords: ['senior', 'manager', 'หัวหน้า', 'supervisor', 'admin', 'executive'],
      exemptEmployeeIds: mergedExemptIds,
      exemptForceOffIds,
      autoExemptSupervisors: !localAutoSupOff,
    };
    cachedExemptConfig = { config: fallback, expiresAt: Date.now() + 60000 };
    return fallback;
  }
}

export function evaluatePhotoExemption(
  employee: {
    employee_id?: string;
    position?: string | null;
    role?: string;
  },
  config: {
    exemptKeywords: string[];
    exemptEmployeeIds: Set<string>;
    exemptForceOffIds?: Set<string>;
    autoExemptSupervisors: boolean;
  }
): boolean {
  if (!employee) return false;

  const { exemptKeywords, exemptEmployeeIds, exemptForceOffIds, autoExemptSupervisors } = config;

  const empId = String(employee.employee_id || '').trim();
  if (empId && exemptForceOffIds?.has(empId)) {
    return false;
  }
  if (empId && exemptEmployeeIds.has(empId)) {
    return true;
  }

  if (!autoExemptSupervisors) {
    return false;
  }

  if (employee.role === 'admin' || employee.role === 'supervisor') {
    return true;
  }

  const pos = String(employee.position || '')
    .replace(/\s*\[(Supervisor|Admin)\]/gi, '')
    .replace(/\s*\((หัวหน้างาน|Admin)\)/gi, '')
    .trim()
    .toLowerCase();
  if (pos) {
    if (exemptKeywords.some((keyword) => pos.includes(keyword))) {
      return true;
    }
  }

  return false;
}

export async function isEmployeePhotoExempt(
  employee: {
    employee_id?: string;
    position?: string | null;
    role?: string;
  }
): Promise<boolean> {
  if (!employee) return false;
  const config = await getExemptConfig();
  return evaluatePhotoExemption(employee, config);
}

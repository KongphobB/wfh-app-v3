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

let cachedExemptConfig: {
  config: {
    exemptKeywords: string[];
    exemptEmployeeIds: Set<string>;
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
  memoryExemptIds = null;
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
  autoExemptSupervisors: boolean;
}> {
  if (cachedExemptConfig && Date.now() < cachedExemptConfig.expiresAt) {
    return cachedExemptConfig.config;
  }

  const localExemptIds = getLocalExemptIds();

  try {
    const configRes = await callGAS('getSystemConfig');
    const cfg = configRes?.config || {};
    const rawList = String(
      cfg.photo_exempt_positions ||
        'Senior, Manager, ซีเนียร์, ผู้จัดการ, ผจก, ผจก., หัวหน้า, Leader, Supervisor, Admin, Executive'
    )
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean);

    const exemptKeywords: string[] = [];
    const mergedExemptIds = new Set<string>(localExemptIds);

    rawList.forEach((item) => {
      const lower = item.toLowerCase();
      if (/^\d+$/.test(item) || item.startsWith('ID:')) {
        mergedExemptIds.add(item.replace('ID:', '').trim());
      } else {
        exemptKeywords.push(lower);
      }
    });

    const autoExemptSupervisors =
      cfg.auto_exempt_supervisors !== undefined
        ? String(cfg.auto_exempt_supervisors).toLowerCase() !== 'false'
        : true;

    const result = { exemptKeywords, exemptEmployeeIds: mergedExemptIds, autoExemptSupervisors };
    cachedExemptConfig = { config: result, expiresAt: Date.now() + 300000 };
    return result;
  } catch {
    const fallback = {
      exemptKeywords: ['senior', 'manager', 'หัวหน้า', 'supervisor', 'admin', 'executive'],
      exemptEmployeeIds: localExemptIds,
      autoExemptSupervisors: true,
    };
    cachedExemptConfig = { config: fallback, expiresAt: Date.now() + 60000 };
    return fallback;
  }
}

export async function isEmployeePhotoExempt(
  employee: {
    employee_id?: string;
    position?: string | null;
    role?: string;
  }
): Promise<boolean> {
  if (!employee) return false;

  const { exemptKeywords, exemptEmployeeIds, autoExemptSupervisors } = await getExemptConfig();

  const empId = String(employee.employee_id || '').trim();
  if (empId && exemptEmployeeIds.has(empId)) {
    return true;
  }

  if (autoExemptSupervisors) {
    if (employee.role === 'admin' || employee.role === 'supervisor') {
      return true;
    }
  }

  const pos = String(employee.position || '').toLowerCase();
  if (pos) {
    if (exemptKeywords.some((keyword) => pos.includes(keyword))) {
      return true;
    }
  }

  return false;
}

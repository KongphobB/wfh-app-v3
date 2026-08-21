import fs from 'fs';
import path from 'path';
import { callGAS } from './gas';

const DATA_DIR = path.join(process.cwd(), 'data');
const EXEMPT_FILE = path.join(DATA_DIR, 'photo_exempt_employees.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

export function getLocalExemptIds(): Set<string> {
  try {
    ensureDataDir();
    if (fs.existsSync(EXEMPT_FILE)) {
      const data = fs.readFileSync(EXEMPT_FILE, 'utf-8');
      const list = JSON.parse(data);
      if (Array.isArray(list)) {
        return new Set(list.map(String));
      }
    }
  } catch (err) {
    console.warn('Error reading local exempt file:', err);
  }
  return new Set<string>();
}

export function saveLocalExemptIds(ids: Set<string>): void {
  try {
    ensureDataDir();
    fs.writeFileSync(EXEMPT_FILE, JSON.stringify(Array.from(ids), null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving local exempt file:', err);
  }
}

export async function getExemptConfig(): Promise<{
  exemptKeywords: string[];
  exemptEmployeeIds: Set<string>;
  autoExemptSupervisors: boolean;
}> {
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

    return { exemptKeywords, exemptEmployeeIds: mergedExemptIds, autoExemptSupervisors };
  } catch {
    return {
      exemptKeywords: ['senior', 'manager', 'หัวหน้า', 'supervisor', 'admin', 'executive'],
      exemptEmployeeIds: localExemptIds,
      autoExemptSupervisors: true,
    };
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

import fs from 'fs';
import path from 'path';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

export interface StoredPushSubscription {
  id: string;
  employee_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

declare global {
  var __pushSubscriptions: StoredPushSubscription[] | undefined;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'push_subscriptions.json');
const TMP_STORE_FILE = '/tmp/push_subscriptions.json';

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

function loadSubscriptionsFromDisk(): StoredPushSubscription[] {
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
    console.warn('Error loading push subscriptions from disk:', err);
  }
  return [];
}

function saveSubscriptionsToDisk(list: StoredPushSubscription[]): void {
  const filePath = getStoragePath();
  try {
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error saving push subscriptions to disk:', err);
  }
}

function getMemoryStore(): StoredPushSubscription[] {
  if (!global.__pushSubscriptions) {
    global.__pushSubscriptions = loadSubscriptionsFromDisk();
  }
  return global.__pushSubscriptions;
}

/**
 * Save or update a push subscription for an employee
 */
export function savePushSubscription(
  employee_id: string,
  sub: PushSubscriptionData,
  userAgent?: string
): StoredPushSubscription {
  const store = getMemoryStore();
  const existingIdx = store.findIndex((s) => s.endpoint === sub.endpoint);
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    store[existingIdx] = {
      ...store[existingIdx],
      employee_id: String(employee_id),
      keys: sub.keys,
      user_agent: userAgent || store[existingIdx].user_agent,
      updated_at: now,
    };
    saveSubscriptionsToDisk(store);
    return store[existingIdx];
  }

  const record: StoredPushSubscription = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    employee_id: String(employee_id),
    endpoint: sub.endpoint,
    keys: sub.keys,
    user_agent: userAgent,
    created_at: now,
    updated_at: now,
  };

  store.push(record);
  saveSubscriptionsToDisk(store);

  // Sync to Google Sheet in background so all Vercel instances share it
  try {
    const { callGAS } = require('./gas');
    callGAS('submitTicket', {
      employeeId: String(employee_id),
      problemType: '__SYS_PUSH_SUB__',
      details: JSON.stringify({
        endpoint: sub.endpoint,
        keys: sub.keys,
        user_agent: userAgent,
      }),
    }).catch(() => {});
  } catch {}

  return record;
}

/**
 * Get all active subscriptions for a specific employee (Synchronous cache lookup)
 */
export function getSubscriptionsForEmployee(employee_id: string): StoredPushSubscription[] {
  const store = getMemoryStore();
  return store.filter((s) => s.employee_id === String(employee_id));
}

/**
 * Get active subscriptions for an employee with fallback sync from Google Sheets (Asynchronous)
 */
export async function getSubscriptionsForEmployeeAsync(employee_id: string): Promise<StoredPushSubscription[]> {
  const store = getMemoryStore();
  const cached = store.filter((s) => String(s.employee_id) === String(employee_id));
  if (cached.length > 0) {
    return cached;
  }

  // Cross-container recovery on Vercel: Query Google Sheets for saved subscriptions
  try {
    const { callGAS } = await import('./gas');
    const res = await callGAS('getLogs', { logType: 'ticket', limit: 200 });
    const rawList = (res?.data || []) as any[];
    const subTickets = rawList.filter(
      (t) => String(t.issueType) === '__SYS_PUSH_SUB__' && String(t.employeeId) === String(employee_id)
    );

    for (const t of subTickets) {
      if (!t.details) continue;
      try {
        const parsed = JSON.parse(t.details);
        if (parsed.endpoint && parsed.keys) {
          const rec: StoredPushSubscription = {
            id: t.ticketId || `sub_${Date.now()}`,
            employee_id: String(employee_id),
            endpoint: parsed.endpoint,
            keys: parsed.keys,
            user_agent: parsed.user_agent,
            created_at: t.dateTime || new Date().toISOString(),
            updated_at: t.dateTime || new Date().toISOString(),
          };
          if (!store.some((s) => s.endpoint === rec.endpoint)) {
            store.push(rec);
          }
        }
      } catch {}
    }

    if (subTickets.length > 0) {
      saveSubscriptionsToDisk(store);
    }
  } catch (err) {
    console.warn('Failed to sync push subscriptions from Google Sheet:', err);
  }

  return store.filter((s) => String(s.employee_id) === String(employee_id));
}

/**
 * Remove an invalid or expired subscription (e.g. 410 Gone / 404)
 */
export function removePushSubscriptionByEndpoint(endpoint: string): void {
  const store = getMemoryStore();
  const initialLength = store.length;
  global.__pushSubscriptions = store.filter((s) => s.endpoint !== endpoint);
  if (global.__pushSubscriptions.length !== initialLength) {
    saveSubscriptionsToDisk(global.__pushSubscriptions);
  }
}

/**
 * Get all stored subscriptions
 */
export function getAllPushSubscriptions(): StoredPushSubscription[] {
  return getMemoryStore();
}

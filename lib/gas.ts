const GAS_WEB_APP_URL =
  process.env.GOOGLE_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwqlMKbRoQlh97mpbJm1--Gorz2ub_5x749utYYBkt2ynF2CeMQejkyFAZq7ccIT5D2ew/exec';

// High-speed In-Memory Cache
interface CacheEntry {
  data: any;
  expiresAt: number;
}

// Global cache across module reloads in development/serverless warm instances
declare global {
  var __gasApiCache: Map<string, CacheEntry> | undefined;
  var __gasInFlight: Map<string, Promise<any>> | undefined;
}

if (!global.__gasApiCache) {
  global.__gasApiCache = new Map<string, CacheEntry>();
}
if (!global.__gasInFlight) {
  global.__gasInFlight = new Map<string, Promise<any>>();
}

const apiCache = global.__gasApiCache;
const inFlightRequests = global.__gasInFlight;

// Cache TTL configurations (in milliseconds)
// Longer TTLs drastically reduce Google Apps Script quota and latency spikes
const CACHE_RULES: Record<string, number> = {
  getSystemConfig: 300000,     // 5 minutes (was 60s)
  getLogs: 45000,             // 45 seconds (was 15s)
  getDashboardSummary: 45000, // 45 seconds (was 15s)
  inspectTab: 180000,         // 3 minutes (was 20s)
  adminGetLogPhoto: 3600000,  // 1 hour
};

// Mutating actions that should immediately invalidate cache
const MUTATION_ACTIONS = new Set([
  'checkin',
  'submitCheckin',
  'submitEmployeeTask',
  'submitSupervisorRating',
  'submitSpotCheck',
  'submitTicket',
  'resolveTicket',
  'changeEmployeePin',
  'employeeChangePin',
  'adminAddNewEmployee',
  'adminUpdateEmployeeInfo',
  'adminDeleteEmployee',
  'adminUpdateConfig',
  'adminBulkUpdateWfhStatus',
]);

export function invalidateGasCache(actionPrefix?: string) {
  if (!actionPrefix) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.startsWith(actionPrefix)) {
      apiCache.delete(key);
    }
  }
}

export async function getLiveEmployeesMap(): Promise<Record<string, { name: string; email?: string; dept?: string; position?: string; supervisorId?: string; pin?: string }>> {
  try {
    const inspectRes = await callGAS('inspectTab', { sheetName: 'ข้อมูลพนักงาน' });
    const targetRows = inspectRes?.targetRows || [];
    if (Array.isArray(targetRows) && targetRows.length > 1) {
      const map: Record<string, any> = {};
      for (const row of targetRows.slice(1)) {
        if (!row || row[0] == null) continue;
        const empId = String(row[0]).trim();
        if (!empId) continue;
        map[empId] = {
          name: row[1] ? String(row[1]).trim() : empId,
          email: row[2] ? String(row[2]).trim() : '',
          dept: row[3] ? String(row[3]).trim() : '',
          position: row[4] ? String(row[4]).trim() : '',
          supervisorId: row[5] && String(row[5]).trim() !== '' ? String(row[5]).trim() : '',
          pin: row[6] ? String(row[6]).trim() : '',
        };
      }
      return map;
    }
  } catch (err) {
    console.warn('Fallback getting live employees map:', err);
  }
  const configRes = await callGAS('getSystemConfig');
  return configRes?.config?.employeesMap || {};
}

async function fetchFromGAS(action: string, payload: Record<string, any>): Promise<any> {
  const bodyData = JSON.stringify({ ...payload, action });

  const res = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: bodyData,
    redirect: 'follow',
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`GAS parse error: ${text.slice(0, 150)}`);
  }
}

export function callGAS<T = any>(action: string, rawPayload: Record<string, any> = {}): Promise<T> {
  const isMutation = MUTATION_ACTIONS.has(action);

  // Normalize payloads for identical read queries to maximize cache hits
  let payload = rawPayload;
  let cacheKeySuffix = JSON.stringify(payload);
  if (!isMutation && action === 'getLogs' && rawPayload.logType) {
    if (rawPayload.logType === 'spotcheck') {
      payload = { ...rawPayload, limit: 300 };
      cacheKeySuffix = `logType_spotcheck`;
    } else if (rawPayload.logType === 'checkin') {
      payload = { ...rawPayload, limit: Math.max(rawPayload.limit || 100, 200) };
      cacheKeySuffix = `logType_checkin`;
    } else if (rawPayload.logType === 'tasks') {
      payload = { ...rawPayload, limit: Math.max(rawPayload.limit || 100, 200) };
      cacheKeySuffix = `logType_tasks`;
    }
  }

  // Invalidate cache if this is a mutating write action
  if (isMutation) {
    apiCache.clear();
  }

  // Check cache for read actions
  const cacheTtl = CACHE_RULES[action];
  const cacheKey = `${action}_${cacheKeySuffix}`;
  if (!isMutation && cacheTtl) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return Promise.resolve(cached.data as T);
    }

    // In-flight deduplication (SingleFlight pattern)
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey) as Promise<T>;
    }
  }

  const executionPromise = (async () => {
    try {
      const parsed = await fetchFromGAS(action, payload);
      if (cacheTtl && parsed?.success) {
        apiCache.set(cacheKey, { data: parsed, expiresAt: Date.now() + cacheTtl });
      }
      return parsed as T;
    } catch (err: any) {
      // If we have an existing cached entry (even if expired), return it rather than failing the UI
      const staleCached = apiCache.get(cacheKey);
      if (!isMutation && staleCached?.data) {
        console.warn(`GAS call ${action} failed/timed out, serving stale cache:`, err?.message);
        return staleCached.data as T;
      }

      // Retry once for read operations on failure
      if (!isMutation) {
        try {
          const retryParsed = await fetchFromGAS(action, payload);
          if (cacheTtl && retryParsed?.success) {
            apiCache.set(cacheKey, { data: retryParsed, expiresAt: Date.now() + cacheTtl });
          }
          return retryParsed as T;
        } catch {
          // If retry fails, rethrow original error
        }
      }
      throw err;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (!isMutation && cacheTtl) {
    inFlightRequests.set(cacheKey, executionPromise);
  }

  return executionPromise;
}

// Client-Server time synchronization module to prevent local PC clock tampering

let serverTimeOffsetMs = 0;
let hasSyncedWithServer = false;

/**
 * Record server timestamp returned by API and compute offset from client Date.now()
 */
export function syncServerTime(serverTimestampMs: number) {
  if (typeof serverTimestampMs === 'number' && !isNaN(serverTimestampMs)) {
    serverTimeOffsetMs = serverTimestampMs - Date.now();
    hasSyncedWithServer = true;
  }
}

/**
 * Get current trusted timestamp (synchronized with server)
 */
export function getSyncedNow(): number {
  return Date.now() + serverTimeOffsetMs;
}

/**
 * Check if the server time offset has been initialized
 */
export function isServerTimeSynced(): boolean {
  return hasSyncedWithServer;
}

const thaiDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
});

const thaiTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Bangkok',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/**
 * Format a date object, timestamp, or ISO string to Bangkok date (YYYY-MM-DD).
 * Defaults to current trusted synced time if no input is provided.
 */
export function getThaiDateStr(dateInput?: Date | number | string): string {
  const d = dateInput !== undefined ? new Date(dateInput) : new Date(getSyncedNow());
  try {
    return thaiDateFormatter.format(d);
  } catch {
    const thaiTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    return thaiTime.toISOString().split('T')[0];
  }
}

/**
 * Get current Bangkok time components (hour, minute, second, timeStr)
 * Defaults to current trusted synced time if no input is provided.
 */
export function getThaiTime(dateInput?: Date | number | string): {
  hour: number;
  minute: number;
  second: number;
  timeStr: string;
} {
  const d = dateInput !== undefined ? new Date(dateInput) : new Date(getSyncedNow());
  try {
    const timeStr = thaiTimeFormatter.format(d);
    const [rawH, m, s] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
    const h = rawH === 24 ? 0 : rawH;
    const normalizedTimeStr = rawH === 24 ? `00:${timeStr.slice(3)}` : timeStr;
    return { hour: h, minute: m, second: s || 0, timeStr: normalizedTimeStr };
  } catch {
    const thaiTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    const h = thaiTime.getUTCHours();
    const m = thaiTime.getUTCMinutes();
    const s = thaiTime.getUTCSeconds();
    const timeStr = [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
    return { hour: h, minute: m, second: s, timeStr };
  }
}

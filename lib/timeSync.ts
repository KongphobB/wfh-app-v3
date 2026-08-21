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

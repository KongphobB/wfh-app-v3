import { jwtVerify } from 'jose';

export interface SessionPayload {
  employee_id: string;
  name: string;
  role: 'employee' | 'supervisor' | 'admin';
  department?: string;
  force_pin_change: boolean;
}

let cachedSecretStr: string | undefined;
let cachedSecretKey: Uint8Array | undefined;

/**
 * Pure Edge-compatible JWT Session Token Verification (No Node.js dependencies)
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return null;
    if (jwtSecret !== cachedSecretStr || !cachedSecretKey) {
      cachedSecretStr = jwtSecret;
      cachedSecretKey = new TextEncoder().encode(jwtSecret);
    }
    const { payload } = await jwtVerify(token, cachedSecretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

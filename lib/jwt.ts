import { jwtVerify } from 'jose';
import { SessionPayload } from '@/types';

/**
 * Pure Edge-compatible JWT Session Token Verification (No Node.js dependencies)
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return null;
    const secretKey = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

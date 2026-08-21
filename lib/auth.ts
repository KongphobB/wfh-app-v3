import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { SessionPayload } from '@/types';
import { verifySessionToken } from '@/lib/jwt';

export { verifySessionToken };

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const COOKIE_NAME = 'wfh_session';

// In-memory rate limiting
const memoryRateLimits = new Map<string, { attempts: number; lockedUntil: number | null }>();

/**
 * Hash PIN using bcrypt (10 rounds)
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

/**
 * Verify PIN against bcrypt hash or plain text
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  if (hash === pin) return true;
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    return bcrypt.compare(pin, hash);
  }
  return hash === pin;
}

/**
 * Create JWT Session Token
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

/**
 * Set HTTP-Only Session Cookie
 */
export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

/**
 * Get current authenticated user session from HTTP-Only cookie
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Clear Session Cookie (Logout)
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Check if employee account is rate-limited (5 failed attempts = locked for 15 mins)
 */
export async function checkRateLimit(employeeId: string): Promise<{ isLimited: boolean; lockMinutesRemaining?: number }> {
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return { isLimited: false };
  }

  const record = memoryRateLimits.get(employeeId);
  if (record && record.lockedUntil && Date.now() < record.lockedUntil) {
    const remainingMinutes = Math.ceil((record.lockedUntil - Date.now()) / (60 * 1000));
    return { isLimited: true, lockMinutesRemaining: remainingMinutes };
  }
  return { isLimited: false };
}

/**
 * Record a failed login attempt
 */
export async function recordFailedAttempt(employeeId: string) {
  const maxAttempts = Number(process.env.MAX_LOGIN_ATTEMPTS || 5);
  const lockoutMs = Number(process.env.LOCKOUT_MINUTES || 15) * 60 * 1000;

  const record = memoryRateLimits.get(employeeId) || { attempts: 0, lockedUntil: null };
  const currentAttempts = record.attempts + 1;
  const lockedUntil = currentAttempts >= maxAttempts ? Date.now() + lockoutMs : null;
  memoryRateLimits.set(employeeId, { attempts: currentAttempts, lockedUntil });
}

/**
 * Reset / Unblock failed login attempts for an employee
 */
export async function resetFailedAttempt(employeeId: string) {
  memoryRateLimits.delete(employeeId);
}

/**
 * Clear all memory rate limits
 */
export function clearAllMemoryRateLimits() {
  memoryRateLimits.clear();
}

/**
 * Single source of truth for Role determination:
 * 1. Admin: employeeId '9999', or dept 'ผู้ดูแลระบบ', or position contains '[Admin]' / '(Admin)'
 * 2. Supervisor: position contains '[Supervisor]' or '(หัวหน้างาน)' or '[หัวหน้างาน]'
 * 3. Employee: Default for everyone else (including newly registered members)
 */
export function determineRole(position?: string, dept?: string, employeeId?: string): SessionPayload['role'] {
  if (employeeId === '9999' || dept?.includes('ผู้ดูแลระบบ') || position?.includes('[Admin]') || position?.toLowerCase().includes('(admin)')) {
    return 'admin';
  }
  if (
    position?.includes('[Supervisor]') ||
    position?.includes('(หัวหน้างาน)') ||
    position?.includes('[หัวหน้างาน]') ||
    position?.toLowerCase().includes('(supervisor)')
  ) {
    return 'supervisor';
  }
  return 'employee';
}

/**
 * Format position text with explicit role tag when Admin updates role
 */
export function formatPositionForRole(rawPosition: string = '', role: SessionPayload['role']): string {
  let clean = rawPosition
    .replace(/\s*\[Supervisor\]/gi, '')
    .replace(/\s*\(หัวหน้างาน\)/g, '')
    .replace(/\s*\[หัวหน้างาน\]/g, '')
    .replace(/\s*\(supervisor\)/gi, '')
    .replace(/\s*\[Admin\]/gi, '')
    .replace(/\s*\(Admin\)/gi, '')
    .trim();

  if (role === 'supervisor') {
    return clean ? `${clean} [Supervisor]` : 'หัวหน้างาน [Supervisor]';
  }
  if (role === 'admin') {
    return clean ? `${clean} [Admin]` : 'ผู้ดูแลระบบ [Admin]';
  }
  return clean || 'พนักงาน';
}


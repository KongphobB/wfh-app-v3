import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SessionPayload } from '@/types';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const COOKIE_NAME = 'wfh_session';

// In-memory fallback for rate limiting if Supabase DB is not connected yet
const memoryRateLimits = new Map<string, { attempts: number; lockedUntil: number | null }>();

/**
 * Hash PIN using bcrypt (10 rounds)
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

/**
 * Verify PIN against bcrypt hash strictly. Legacy plain-text fallback has been removed.
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(pin, hash);
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
 * Verify & Decode JWT Session Token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
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

  if (isSupabaseConfigured()) {
    const { data } = await supabaseAdmin
      .from('login_attempts')
      .select('*')
      .eq('key', employeeId)
      .single();

    if (data && data.locked_until) {
      const lockedUntil = new Date(data.locked_until).getTime();
      const now = Date.now();
      if (now < lockedUntil) {
        const remainingMinutes = Math.ceil((lockedUntil - now) / (60 * 1000));
        return { isLimited: true, lockMinutesRemaining: remainingMinutes };
      }
    }
    return { isLimited: false };
  }

  // Memory fallback
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

  if (isSupabaseConfigured()) {
    const { data } = await supabaseAdmin
      .from('login_attempts')
      .select('*')
      .eq('key', employeeId)
      .single();

    const currentAttempts = (data?.attempts || 0) + 1;
    const shouldLock = currentAttempts >= maxAttempts;
    const lockedUntil = shouldLock ? new Date(Date.now() + lockoutMs).toISOString() : null;

    await supabaseAdmin.from('login_attempts').upsert({
      key: employeeId,
      attempts: currentAttempts,
      locked_until: lockedUntil,
    });
    return;
  }

  // Memory fallback
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
  if (isSupabaseConfigured()) {
    await supabaseAdmin.from('login_attempts').delete().eq('key', employeeId);
  }
}

/**
 * Clear all memory rate limits
 */
export function clearAllMemoryRateLimits() {
  memoryRateLimits.clear();
}

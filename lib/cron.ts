import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Validates CRON_SECRET auth header for serverless cron endpoints
 * Fail-closed model: Returns 500 if CRON_SECRET is unconfigured, or 401 if token is invalid/missing.
 * Uses crypto.timingSafeEqual to prevent side-channel timing attacks.
 */
export function verifyCronAuth(request: Request): { authorized: boolean; response?: NextResponse } {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET is not configured');
    return {
      authorized: false,
      response: NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 }),
    };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 }),
    };
  }

  const expectedHeader = `Bearer ${cronSecret}`;
  const authBuffer = Buffer.from(authHeader);
  const expectedBuffer = Buffer.from(expectedHeader);

  // Buffer length check is required because timingSafeEqual throws RangeError if lengths differ
  if (authBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(authBuffer, expectedBuffer)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 }),
    };
  }

  return { authorized: true };
}

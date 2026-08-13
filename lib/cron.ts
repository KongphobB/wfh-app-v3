import { NextResponse } from 'next/server';

/**
 * Validates CRON_SECRET auth header for serverless cron endpoints
 * Fail-closed model: Returns 500 if CRON_SECRET is unconfigured, or 401 if token is invalid/missing.
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
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 }),
    };
  }

  return { authorized: true };
}

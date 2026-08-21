import { NextResponse } from 'next/server';
import { callGAS } from '@/lib/gas';
import { verifyCronAuth } from '@/lib/cron';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const res = await callGAS('runScheduledSpotChecks');
    return NextResponse.json({
      success: true,
      result: res,
    });
  } catch (error: any) {
    console.error('SpotCheck tick error:', error);
    return NextResponse.json({ error: error?.message || 'SpotCheck tick failed' }, { status: 500 });
  }
}

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
    // Check if current time in Bangkok (ICT / UTC+7) is in lunch break (12:00 - 13:00)
    const now = new Date();
    const bkkHourStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Bangkok', hour12: false, hour: '2-digit' });
    const bkkHour = parseInt(bkkHourStr, 10);

    if (bkkHour === 12) {
      return NextResponse.json({
        success: true,
        message: 'ขณะนี้เวลา 12:00 - 13:00 น. (ช่วงพักเที่ยง Lunch Break) ยกเว้นการสุ่มตรวจอัตโนมัติ',
        skipped: true,
      });
    }

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

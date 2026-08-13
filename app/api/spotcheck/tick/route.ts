import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';
import { verifyCronAuth } from '@/lib/cron';

/**
 * Production tick endpoint to trigger scheduled spot checks and sweep expired pending spot checks (Rule 3)
 * Secured via CRON_SECRET Auth Guard (Fail-closed 500 when unconfigured, 401 when invalid)
 */
export async function GET(request: Request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const dayOfWeek = now.getDay(); // 0 = Sun, 6 = Sat

    // 1. Skip on weekends (Saturday & Sunday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({ message: 'วันหยุดเสาร์-อาทิตย์ ข้ามการสุ่มตรวจ' });
    }

    const currentH = String(now.getHours()).padStart(2, '0');
    const currentM = String(now.getMinutes()).padStart(2, '0');
    const currentS = String(now.getSeconds()).padStart(2, '0');
    const currentTimeStr = `${currentH}:${currentM}:${currentS}`;

    // 2. Trigger scheduled spot checks for today where scheduled_time <= currentTimeStr
    const { data: scheduledChecks } = await supabaseAdmin
      .from('spot_checks')
      .select('*')
      .eq('check_date', todayStr)
      .eq('result_status', 'Scheduled')
      .lte('scheduled_time', currentTimeStr);

    let triggeredCount = 0;
    if (scheduledChecks && scheduledChecks.length > 0) {
      for (const check of scheduledChecks) {
        await supabaseAdmin
          .from('spot_checks')
          .update({
            result_status: 'Pending',
            created_at: now.toISOString(),
          })
          .eq('id', check.id);

        // Send real-time notification with 10-minute response window notice
        await createNotification({
          employee_id: check.employee_id,
          type: 'spotcheck',
          title: 'แจ้งเตือนสุ่มตรวจยืนยันตัวตน',
          message: `มีการสุ่มตรวจรอบ${check.round} (${check.scheduled_time} น.) กรุณายืนยันตัวตนภายใน 10 นาที`,
          link: '/spotcheck',
        });

        triggeredCount++;
      }
    }

    // 3. Sweep pending spot checks created over 10.5 minutes ago (630 seconds response buffer)
    const tenPointFiveMinsAgo = new Date(now.getTime() - 10.5 * 60 * 1000).toISOString();
    const { data: expiredChecks } = await supabaseAdmin
      .from('spot_checks')
      .update({ result_status: 'ไม่ผ่านการสุ่มตรวจ (ขาดการติดต่อ)' })
      .eq('result_status', 'Pending')
      .lt('created_at', tenPointFiveMinsAgo)
      .select();

    const sweptCount = expiredChecks?.length || 0;

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      triggeredSpotChecks: triggeredCount,
      sweptExpiredChecks: sweptCount,
    });
  } catch (error) {
    console.error('SpotCheck tick error:', error);
    return NextResponse.json({ error: 'SpotCheck tick failed' }, { status: 500 });
  }
}

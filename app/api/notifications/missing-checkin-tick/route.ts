import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';
import { verifyCronAuth } from '@/lib/cron';

/**
 * Production tick endpoint to detect employees who haven't checked in by cutoff time
 * (Default cutoff time: 09:30 or process.env.MISSING_CHECKIN_CUTOFF_TIME)
 * Secured via CRON_SECRET Auth Guard (Fail-closed 500 when unconfigured, 401 when invalid)
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const cutoffTimeStr = process.env.MISSING_CHECKIN_CUTOFF_TIME || '09:30';

    const [cutoffHour, cutoffMinute] = cutoffTimeStr.split(':').map(Number);
    const cutoffDate = new Date(now);
    cutoffDate.setHours(cutoffHour || 9, cutoffMinute || 30, 0, 0);

    // Enforce cutoff time check: Do not execute sweep if current time is before cutoff time
    if (now < cutoffDate) {
      return NextResponse.json({
        message: `ยังไม่ถึงเวลาคัตออฟ (${cutoffTimeStr} น.) — ยังไม่ทำการตรวจสอบ`,
        today: todayStr,
        currentTime: now.toLocaleTimeString('th-TH'),
        cutoffTime: cutoffTimeStr,
      });
    }

    // 1. Fetch active employees
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('employee_id, name, supervisor_id')
      .eq('wfh_status', 'เปิดสิทธิ์')
      .eq('role', 'employee');

    if (!employees || employees.length === 0) {
      return NextResponse.json({ message: 'No active employees to check' });
    }

    let notifiedCount = 0;

    for (const emp of employees) {
      // 2. Check if employee has checked in today
      const { data: checkin } = await supabaseAdmin
        .from('checkin_logs')
        .select('id')
        .eq('employee_id', emp.employee_id)
        .eq('log_date', todayStr)
        .eq('log_type', 'เข้างาน')
        .maybeSingle();

      if (!checkin) {
        // 3. Check if missing_checkin notification was already sent today for this employee
        const startOfDay = `${todayStr}T00:00:00.000Z`;
        const endOfDay = `${todayStr}T23:59:59.999Z`;

        const { data: existingNotif } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('employee_id', emp.employee_id)
          .eq('type', 'missing_checkin')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .maybeSingle();

        if (!existingNotif) {
          // Send notification to employee
          await createNotification({
            employee_id: emp.employee_id,
            type: 'missing_checkin',
            title: 'แจ้งเตือนลืมเช็คอิน',
            message: 'คุณยังไม่ได้เช็คอินเข้างานวันนี้ กรุณาเช็คอินโดยเร็ว',
            link: '/checkin',
          });

          // Send notification to supervisor if exists
          if (emp.supervisor_id) {
            await createNotification({
              employee_id: emp.supervisor_id,
              type: 'missing_checkin',
              title: 'แจ้งเตือนพนักงานลืมเช็คอิน',
              message: `พนักงาน ${emp.name} (${emp.employee_id}) ยังไม่ได้เช็คอินเข้างานวันนี้`,
              link: '/supervisor',
            });
          }

          // Insert record in missing_checkins table
          await supabaseAdmin.from('missing_checkins').insert({
            log_date: todayStr,
            employee_id: emp.employee_id,
            status: 'ขาดเช็คอิน',
          });

          notifiedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      today: todayStr,
      cutoffTime: cutoffTimeStr,
      missingEmployeesNotified: notifiedCount,
    });
  } catch (error) {
    console.error('Missing checkin tick error:', error);
    return NextResponse.json({ error: 'Missing checkin tick failed' }, { status: 500 });
  }
}

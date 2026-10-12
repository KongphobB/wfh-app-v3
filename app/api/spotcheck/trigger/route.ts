import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS, getLiveEmployeesMap } from '@/lib/gas';
import { createNotification } from '@/lib/notifications';
import { sendSpotCheckTriggeredEmail } from '@/lib/email';
import { SpotCheck } from '@/types';
import { getThaiDateStr, getThaiTime } from '@/lib/timeSync';
import { applyCheckinAdjustments } from '@/lib/checkinAdjustmentStore';

declare global {
  var __activeTestSpotChecks: SpotCheck[] | undefined;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'supervisor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์สั่งสุ่มตรวจพนักงาน' }, { status: 403 });
    }

    const body = await request.json();
    const { employee_id, note } = body;

    if (!employee_id) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสพนักงานที่ต้องการสุ่มตรวจ' }, { status: 400 });
    }

    const [employeesMap, checkinRes] = await Promise.all([
      getLiveEmployeesMap(),
      callGAS('getLogs', { logType: 'checkin', limit: 150 }),
    ]);
    const targetEmployee = employeesMap[employee_id];

    // If supervisor, ensure target employee belongs to their team
    if (session.role === 'supervisor') {
      const isSubordinate = String(targetEmployee?.supervisorId) === String(session.employee_id);
      if (!isSubordinate) {
        return NextResponse.json({ error: 'พนักงานคนนี้ไม่ได้อยู่ในสายบังคับบัญชาของคุณ' }, { status: 403 });
      }
    }

    const now = new Date();
    const todayStr = getThaiDateStr(now);
    const timeStr = getThaiTime(now).timeStr;

    const checkinLogs = applyCheckinAdjustments((checkinRes?.data || []) as any[]);
    const todayMorningLog = checkinLogs.find(
      (c) =>
        String(c.employeeId || c.employee_id) === String(employee_id) &&
        c.date === todayStr &&
        (c.type === 'เข้างาน' || c.log_type === 'เข้างาน')
    );
    const todayClockoutLog = checkinLogs.find(
      (c) =>
        String(c.employeeId || c.employee_id) === String(employee_id) &&
        c.date === todayStr &&
        String(c.type || c.log_type || '').includes('ออกงาน')
    );
    const hasCheckedInToday = Boolean(todayMorningLog);
    const isOfficeCheckin = Boolean(
      todayMorningLog &&
        (todayMorningLog.verificationStatus?.includes('ออฟฟิศ') ||
          todayMorningLog.verification_status?.includes('ออฟฟิศ') ||
          todayMorningLog.note?.includes('ปฏิบัติงานที่ออฟฟิศ'))
    );
    const hasCheckedInWfhToday = Boolean(todayMorningLog && !isOfficeCheckin);

    // Guard 1: Check daily status (Office, Leave, Holiday are exempt from spot checks)
    const { resolveEmployeeDailyStatus } = await import('@/lib/dailyStatus');
    const dailyStatus = resolveEmployeeDailyStatus(String(employee_id), todayStr, {
      hasCheckedInWfhToday,
      isOfficeCheckin,
    });
    if (dailyStatus.status === 'office') {
      return NextResponse.json(
        { error: `พนักงาน ${targetEmployee?.name || employee_id} ปฏิบัติงานที่ออฟฟิศในวันนี้ จึงได้รับการยกเว้นการสุ่มตรวจ` },
        { status: 400 }
      );
    }
    if (dailyStatus.status === 'leave' || dailyStatus.status === 'leave_pending') {
      return NextResponse.json(
        { error: `พนักงาน ${targetEmployee?.name || employee_id} อยู่ในสถานะลางาน จึงได้รับการยกเว้นการสุ่มตรวจ` },
        { status: 400 }
      );
    }
    if (dailyStatus.status === 'holiday') {
      return NextResponse.json(
        { error: `วันนี้เป็นวันหยุด (${dailyStatus.reason}) จึงได้รับการยกเว้นการสุ่มตรวจ` },
        { status: 400 }
      );
    }

    // Guard 2: Employee MUST have checked in today (เข้างาน) to be spot checked
    if (!hasCheckedInToday) {
      return NextResponse.json(
        { error: `พนักงาน ${targetEmployee?.name || employee_id} ยังไม่ได้ลงเวลาเข้างานในวันนี้ จึงไม่สามารถสั่งสุ่มตรวจได้` },
        { status: 400 }
      );
    }

    // Guard 3: Employee MUST NOT have already clocked out today (ออกงาน)
    if (todayClockoutLog) {
      return NextResponse.json(
        { error: `พนักงาน ${targetEmployee?.name || employee_id} ลงเวลาออกงานวันนี้เรียบร้อยแล้ว จึงไม่สามารถสั่งสุ่มตรวจได้` },
        { status: 400 }
      );
    }

    const newSpotCheckId = `SPOT-MANUAL-${Date.now()}-${employee_id}`;

    const newSpotCheck: SpotCheck = {
      id: newSpotCheckId,
      employee_id: String(employee_id),
      check_date: todayStr,
      round: 'เฉพาะกิจ (หัวหน้าสั่งตรวจ)',
      scheduled_time: timeStr,
      actual_scan_time: null,
      gps_lat: null,
      gps_lng: null,
      photo_url: null,
      result_status: 'Scheduled',
      created_at: now.toISOString(),
    };

    const { addManualSpotCheckAsync } = await import('@/lib/manualSpotCheckStore');
    await addManualSpotCheckAsync(newSpotCheck);

    try {
      const { createAuditLog } = await import('@/lib/auditStore');
      createAuditLog({
        admin_id: String(session.employee_id),
        admin_name: session.name || String(session.employee_id),
        action_type: 'SYSTEM_ACTION',
        action_title: 'สั่งสุ่มตรวจยืนยันตัวตนเฉพาะกิจ (Spot Check)',
        target_employee_id: String(employee_id),
        target_employee_name: targetEmployee?.name || String(employee_id),
        details: `สั่งสุ่มตรวจเฉพาะกิจ (ID: ${newSpotCheckId})${note ? ` หมายเหตุ: ${note}` : ''}`,
      });
    } catch {}

    if (!global.__activeTestSpotChecks) {
      global.__activeTestSpotChecks = [];
    }

    // Replace any pending spot check for this employee with the new active one
    global.__activeTestSpotChecks = [
      newSpotCheck,
      ...global.__activeTestSpotChecks.filter((t) => !(t.employee_id === String(employee_id) && t.result_status === 'Scheduled')),
    ];

    // Dispatch in-app notification, real-time email alert, and Web Push concurrently
    const empName = targetEmployee?.name || employee_id;
    const empEmail = targetEmployee?.email;
    const deadlineDate = new Date(now.getTime() + 10 * 60 * 1000);
    const deadlineStr = getThaiTime(deadlineDate).timeStr;
    const alertBody = `หัวหน้างานได้ส่งคำสั่งสุ่มตรวจ กรุณาเปิดกล้องถ่ายภาพ Selfie สดยืนยันตัวตนภายใน 10 นาที (เวลา ${timeStr} น.)${note ? ` หมายเหตุ: "${note}"` : ''}`;

    const { sendPushToEmployee } = await import('@/lib/webPush');

    const [, emailSent, pushSent] = await Promise.all([
      createNotification({
        employee_id: String(employee_id),
        type: 'spotcheck',
        title: '🔔 ได้รับคำสั่งสุ่มตรวจยืนยันตัวตนเฉพาะกิจ!',
        message: alertBody,
        link: '/spotcheck',
      }).catch((notifErr) => {
        console.warn('Failed to dispatch spot check notification:', notifErr);
      }),
      empEmail
        ? sendSpotCheckTriggeredEmail({
            employeeName: empName,
            employeeId: String(employee_id),
            employeeEmail: empEmail,
            round: 'เฉพาะกิจ (หัวหน้าสั่งตรวจ)',
            scheduledTime: timeStr,
            deadlineTime: deadlineStr,
            note: note || undefined,
          })
            .then((res) => Boolean(res))
            .catch((emailErr) => {
              console.warn('Failed to send spot check email alert:', emailErr);
              return false;
            })
        : Promise.resolve(false),
      sendPushToEmployee(String(employee_id), {
        title: '🔔 คำสั่งสุ่มตรวจยืนยันตัวตนเฉพาะกิจ!',
        body: alertBody,
        url: '/spotcheck',
        tag: `spotcheck_${employee_id}_${Date.now()}`,
        vibrate: [300, 150, 300, 150, 400],
        requireInteraction: true,
        data: {
          spotCheck: newSpotCheck,
        },
      })
        .then((res) => res?.sent || 0)
        .catch((pushErr) => {
          console.warn('Failed to dispatch web push alert:', pushErr);
          return 0;
        }),
    ]);

    return NextResponse.json({
      success: true,
      message: `ส่งคำสั่งสุ่มตรวจไปยังคุณ ${empName} (${employee_id}) เรียบร้อยแล้ว (ระบบเริ่มนับถอยหลัง 10 นาที พร้อมส่งเมลเตือนตรงเข้ากล่องข้อความ)`,
      spotCheck: newSpotCheck,
      emailSent,
      pushSent,
    });
  } catch (error: any) {
    console.error('Trigger spot check error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการสั่งสุ่มตรวจ' }, { status: 500 });
  }
}

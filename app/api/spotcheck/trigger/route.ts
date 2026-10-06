import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS, getLiveEmployeesMap } from '@/lib/gas';
import { createNotification } from '@/lib/notifications';
import { sendSpotCheckTriggeredEmail } from '@/lib/email';
import { SpotCheck } from '@/types';
import { getThaiDateStr, getThaiTime } from '@/lib/timeSync';

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

    const employeesMap = await getLiveEmployeesMap();
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

    // Guard: Employee MUST have checked in today (เข้างาน) to be spot checked
    const checkinRes = await callGAS('getLogs', { logType: 'checkin', limit: 150 });
    const checkinLogs = (checkinRes?.data || []) as any[];
    const hasCheckedInToday = checkinLogs.some(
      (c) =>
        String(c.employeeId || c.employee_id) === String(employee_id) &&
        c.date === todayStr &&
        (c.type === 'เข้างาน' || c.log_type === 'เข้างาน')
    );

    if (!hasCheckedInToday) {
      return NextResponse.json(
        { error: `พนักงาน ${targetEmployee?.name || employee_id} ยังไม่ได้ลงเวลาเข้างานในวันนี้ จึงไม่สามารถสั่งสุ่มตรวจได้` },
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

    const { addManualSpotCheck } = await import('@/lib/manualSpotCheckStore');
    addManualSpotCheck(newSpotCheck);

    if (!global.__activeTestSpotChecks) {
      global.__activeTestSpotChecks = [];
    }

    // Replace any pending spot check for this employee with the new active one
    global.__activeTestSpotChecks = [
      newSpotCheck,
      ...global.__activeTestSpotChecks.filter((t) => !(t.employee_id === String(employee_id) && t.result_status === 'Scheduled')),
    ];

    // Send in-app notification to the target subordinate
    const empName = targetEmployee?.name || employee_id;
    try {
      await createNotification({
        employee_id: String(employee_id),
        type: 'spotcheck',
        title: '🔔 ได้รับคำสั่งสุ่มตรวจยืนยันตัวตนเฉพาะกิจ!',
        message: `หัวหน้างานได้ส่งคำสั่งสุ่มตรวจ กรุณาเปิดกล้องถ่ายภาพ Selfie สดยืนยันตัวตนภายใน 10 นาที (เวลา ${timeStr} น.)${note ? ` หมายเหตุ: "${note}"` : ''}`,
        link: '/spotcheck',
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch spot check notification:', notifErr);
    }

    // Real-time Email Alert directly to employee so mobile/Outlook gets alerted immediately
    const empEmail = targetEmployee?.email;
    if (empEmail) {
      const deadlineDate = new Date(now.getTime() + 10 * 60 * 1000);
      const deadlineStr = getThaiTime(deadlineDate).timeStr;
      sendSpotCheckTriggeredEmail({
        employeeName: empName,
        employeeId: String(employee_id),
        employeeEmail: empEmail,
        round: 'เฉพาะกิจ (หัวหน้าสั่งตรวจ)',
        scheduledTime: timeStr,
        deadlineTime: deadlineStr,
        note: note || undefined,
      }).catch((emailErr) => {
        console.warn('Failed to send spot check email alert:', emailErr);
      });
    }

    // Full Web Push Notification to wake up mobile device / lock screen (PWA Background Push)
    try {
      const { sendPushToEmployee } = await import('@/lib/webPush');
      sendPushToEmployee(String(employee_id), {
        title: '🔔 คำสั่งสุ่มตรวจยืนยันตัวตนเฉพาะกิจ!',
        body: `หัวหน้างานได้ส่งคำสั่งสุ่มตรวจ กรุณาเปิดกล้องถ่ายภาพ Selfie สดยืนยันตัวตนภายใน 10 นาที (เวลา ${timeStr} น.)${note ? ` หมายเหตุ: "${note}"` : ''}`,
        url: '/spotcheck',
        tag: `spotcheck_${employee_id}_${Date.now()}`,
        vibrate: [300, 150, 300, 150, 400],
        requireInteraction: true,
        data: {
          spotCheck: newSpotCheck,
        },
      }).catch((pushErr) => {
        console.warn('Failed to dispatch web push alert:', pushErr);
      });
    } catch (pushImportErr) {
      console.warn('Failed to import webPush:', pushImportErr);
    }

    return NextResponse.json({
      success: true,
      message: `ส่งคำสั่งสุ่มตรวจไปยังคุณ ${empName} (${employee_id}) เรียบร้อยแล้ว (ระบบเริ่มนับถอยหลัง 10 นาที พร้อมส่งเมลเตือนตรงเข้ากล่องข้อความ)`,
      spotCheck: newSpotCheck,
    });
  } catch (error: any) {
    console.error('Trigger spot check error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการสั่งสุ่มตรวจ' }, { status: 500 });
  }
}

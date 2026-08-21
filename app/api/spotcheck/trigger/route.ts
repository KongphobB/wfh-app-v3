import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getLiveEmployeesMap } from '@/lib/gas';
import { createNotification } from '@/lib/notifications';
import { SpotCheck } from '@/types';

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
      if (!isSubordinate && employee_id !== '1111' && employee_id !== '1304') {
        return NextResponse.json({ error: 'พนักงานคนนี้ไม่ได้อยู่ในสายบังคับบัญชาของคุณ' }, { status: 403 });
      }
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newSpotCheckId = `SPOT-MANUAL-${Date.now()}-${employee_id}`;

    const newSpotCheck: SpotCheck = {
      id: newSpotCheckId,
      employee_id: String(employee_id),
      check_date: todayStr,
      round: 'เฉพาะกิจ (หัวหน้าสั่งตรวจ)',
      scheduled_time: now.toTimeString().split(' ')[0],
      actual_scan_time: null,
      gps_lat: null,
      gps_lng: null,
      photo_url: null,
      result_status: 'Scheduled',
      created_at: now.toISOString(),
    };

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

    return NextResponse.json({
      success: true,
      message: `ส่งคำสั่งสุ่มตรวจไปยังคุณ ${empName} (${employee_id}) เรียบร้อยแล้ว (ระบบเริ่มนับถอยหลัง 10 นาที)`,
      spotCheck: newSpotCheck,
    });
  } catch (error: any) {
    console.error('Trigger spot check error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการสั่งสุ่มตรวจ' }, { status: 500 });
  }
}

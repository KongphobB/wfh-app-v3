import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS } from '@/lib/gas';
import { CheckinLog, TaskItem, SpotCheck } from '@/types';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch unified dashboard data from Google Sheets in ONE single call
    const res = await callGAS('getDashboardSummary', { employeeId: session.employee_id });
    if (!res || !res.success) {
      return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลแดชบอร์ดได้' }, { status: 500 });
    }

    const employeesMap = res.config?.employeesMap || {};
    const rawCheckins = (res.checkinLogs || []) as any[];
    const rawTasks = (res.tasks || []) as any[];
    const rawSpots = (res.spotChecks || []) as any[];

    // 1. Format Checkin Logs (Filter for self today)
    const selfCheckins = rawCheckins.filter(
      (l) => String(l.employeeId) === String(session.employee_id) && l.date === todayStr
    );

    const formattedCheckins: CheckinLog[] = selfCheckins.map((l) => {
      const timeFormatted = l.time ? (l.time.length === 5 ? `${l.time}:00` : l.time) : '08:00:00';
      const isoTimeStr = `${l.date}T${timeFormatted}+07:00`;

      return {
        id: l.uuid || `${l.employeeId}_${l.date}_${l.time}`,
        employee_id: String(l.employeeId),
        employee_name: l.name || session.name,
        log_type: l.type || 'เข้างาน',
        log_date: l.date,
        log_time: isoTimeStr,
        gps_lat: null,
        gps_lng: null,
        photo_url: l.photo || null,
        note: l.note || null,
        out_of_bounds_reason: null,
        is_early_leave: false,
        verification_status: l.verificationStatus || 'ปกติ',
        created_at: isoTimeStr,
        updated_at: isoTimeStr,
      };
    });

    // 2. Format Tasks (Filter for self today or recent)
    const selfTasks = rawTasks.filter((t) => String(t.employeeId) === String(session.employee_id));
    const formattedTasks: TaskItem[] = selfTasks.map((t) => {
      const starRating = t.starRating || t.rating ? parseInt(t.starRating || t.rating, 10) : null;
      return {
        id: t.uuid || `${t.employeeId}_${t.date}`,
        submit_date: t.date || t.submitDate,
        employee_id: String(t.employeeId),
        employee_name: t.name || session.name,
        tasks_assigned: parseInt(t.tasksAssigned || t.assigned || 1, 10),
        tasks_completed: parseInt(t.tasksCompleted || t.completed || 0, 10),
        details: t.details || t.taskDetails || '',
        submission_link: t.submissionLink || t.link || null,
        star_rating: starRating && !isNaN(starRating) ? starRating : null,
        supervisor_note: t.supervisorNote || t.note || null,
        created_at: `${t.date || todayStr}T09:00:00+07:00`,
      };
    });

    // 3. Format Spot Checks (Filter for self today)
    const selfSpots = rawSpots.filter(
      (s) => String(s.employeeId) === String(session.employee_id) && s.date === todayStr
    );
    const formattedSpots: SpotCheck[] = selfSpots.map((s) => ({
      id: s.uuid || `${s.employeeId}_${s.date}_${s.round}`,
      employee_id: String(s.employeeId),
      check_date: s.date || todayStr,
      round: s.round || 'เช้า',
      scheduled_time: s.scheduledTime || '10:00:00',
      actual_scan_time: s.actualScanTime || null,
      gps_lat: null,
      gps_lng: null,
      photo_url: s.photo || null,
      result_status: s.resultStatus || 'Scheduled',
      created_at: `${s.date || todayStr}T${s.scheduledTime || '10:00:00'}+07:00`,
    }));

    const currentEmp = employeesMap[session.employee_id] || {};
    const wfhStatus = currentEmp.wfhStatus || 'เปิดสิทธิ์';
    const activeSpotCheck = formattedSpots.find((s) => s.result_status === 'Pending') || null;

    return NextResponse.json({
      success: true,
      role: session.role,
      wfhStatus: wfhStatus,
      checkinLogs: formattedCheckins,
      tasks: formattedTasks,
      spotChecks: formattedSpots,
      activeSpotCheck,
    });
  } catch (error: any) {
    console.error('GET dashboard summary error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดแดชบอร์ด' }, { status: 500 });
  }
}

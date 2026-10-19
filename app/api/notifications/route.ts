import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getNotificationsForUser,
  markNotificationsAsRead,
  markNotifIdAsRead,
  isNotifRead,
} from '@/lib/notifications';
import { callGAS } from '@/lib/gas';
import { AppNotification } from '@/types';
import { getThaiDateStr, getThaiTime } from '@/lib/timeSync';
import { isEmployeeAtOfficeToday } from '@/lib/dailyLocationStore';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const todayStr = getThaiDateStr();
    const { resolveEmployeeDailyStatus } = await import('@/lib/dailyStatus');
    const { applyCheckinAdjustments } = await import('@/lib/checkinAdjustmentStore');

    // Fetch spotcheck and checkin logs in parallel so daily status accurately reflects ad-hoc WFH/Office check-ins
    const [spotGasRes, checkinGasRes] = await Promise.all([
      callGAS('getLogs', { logType: 'spotcheck', limit: 300 }).catch(() => ({ data: [] })),
      callGAS('getLogs', { logType: 'checkin', limit: 200 }).catch(() => ({ data: [] })),
    ]);

    const rawSpotChecks = (spotGasRes?.data || []) as any[];
    const checkinLogs = applyCheckinAdjustments((checkinGasRes?.data || []) as any[]);

    const todayMorningCheckin = checkinLogs.find(
      (c) =>
        String(c.employeeId || c.employee_id) === String(session.employee_id) &&
        c.date === todayStr &&
        (c.type === 'เข้างาน' || c.log_type === 'เข้างาน')
    );
    const isOfficeCheckin = Boolean(
      todayMorningCheckin &&
        (todayMorningCheckin.verificationStatus?.includes('ออฟฟิศ') ||
          todayMorningCheckin.verificationStatus?.includes('Office') ||
          todayMorningCheckin.verification_status?.includes('ออฟฟิศ') ||
          todayMorningCheckin.note?.includes('ปฏิบัติงานที่ออฟฟิศ'))
    );
    const hasCheckedInWfhToday = Boolean(todayMorningCheckin && !isOfficeCheckin);
    const hasVerifiedAfternoonToday = checkinLogs.some(
      (c) =>
        String(c.employeeId || c.employee_id) === String(session.employee_id) &&
        c.date === todayStr &&
        (c.type === 'ยืนยันตัวตน' || c.log_type === 'ยืนยันตัวตน') &&
        !String(c.note || '').includes('[สุ่มตรวจ')
    );

    const todayDailyStatus = resolveEmployeeDailyStatus(session.employee_id, todayStr, {
      hasCheckedInWfhToday,
      isOfficeCheckin,
    });
    const isOfficeToday = todayDailyStatus.location === 'office' || todayDailyStatus.status === 'office';
    const isExemptRoutineToday = todayDailyStatus.isExemptFromRoutineSpotCheck;
    const memoryNotifs = getNotificationsForUser(session.employee_id, session.role);
    const dynamicNotifs: AppNotification[] = [];

    // Include active manual spot checks from persistent store (with Google Sheets recovery)
    try {
      const { getActiveManualSpotChecksAsync } = await import('@/lib/manualSpotCheckStore');
      const activeManualChecks = await getActiveManualSpotChecksAsync(String(session.employee_id));
      for (const mc of activeManualChecks) {
        if (mc.result_status === 'Scheduled' || mc.result_status === 'Pending') {
          const notifId = `spot_manual_${mc.id}`;
          const alreadyExists = memoryNotifs.some((m) => m.id === notifId || m.message?.includes(mc.id));
          if (!alreadyExists) {
            dynamicNotifs.unshift({
              id: notifId,
              employee_id: session.employee_id,
              type: 'spotcheck',
              title: '🔔 ได้รับคำสั่งสุ่มตรวจยืนยันตัวตนเฉพาะกิจ!',
              message: `หัวหน้างานได้ส่งคำสั่งสุ่มตรวจ กรุณาเปิดกล้องถ่ายภาพ Selfie สดยืนยันตัวตนภายใน 10 นาที (เวลา ${mc.scheduled_time} น.)`,
              link: '/spotcheck',
              is_read: isNotifRead(notifId),
              created_at: mc.created_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch {}

    // Process spotcheck logs to generate real-time notification items
    try {
      const userChecks = rawSpotChecks.filter(
        (s) => String(s.employeeId) === String(session.employee_id) && s.date === todayStr
      );

      // Group spot checks by round to prevent false failure alerts on duplicate records
      const roundsMap = new Map<string, any[]>();
      for (const s of userChecks) {
        const r = s.round || 'เช้า';
        if (!roundsMap.has(r)) roundsMap.set(r, []);
        roundsMap.get(r)!.push(s);
      }

      const nowMs = Date.now();

      for (const [roundName, checksInRound] of roundsMap.entries()) {
        // If employee is at the office, on leave, or on holiday today, routine rounds (เช้า / บ่าย / ประจำวัน) are exempt
        if (isExemptRoutineToday && (roundName.includes('เช้า') || roundName.includes('บ่าย') || roundName.includes('ประจำวัน'))) {
          continue;
        }

        const isRoundPassed = checksInRound.some((s) => {
          const status = s.status || s.resultStatus || '';
          return status === 'Pass' || status === 'ผ่าน' || status === 'ผ่านการสุ่มตรวจ' || Boolean(s.actualScanTime || s.checkInTime);
        });

        // If employee has already PASSED this round today, skip any active/failed notifications for this round!
        if (isRoundPassed) {
          continue;
        }

        // Otherwise check the most relevant check for this round
        const latestCheck = checksInRound[0];
        const id = latestCheck.uuid || `${latestCheck.employeeId}_${latestCheck.date}_${roundName}`;
        const rawScheduledTime = String(
          latestCheck.triggeredTime || latestCheck.scheduledTime || latestCheck.time || (roundName === 'เช้า' ? '09:30:00' : '14:30:00')
        ).trim();
        const timeMatch = rawScheduledTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        const normalizedTime = timeMatch
          ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:${timeMatch[3] || '00'}`
          : roundName === 'เช้า'
            ? '09:30:00'
            : '14:30:00';
        const rawTriggerMs = new Date(`${latestCheck.date || todayStr}T${normalizedTime}+07:00`).getTime();
        const triggerTimeMs = Number.isFinite(rawTriggerMs) ? rawTriggerMs : nowMs;

        const latestStatus = latestCheck.status || latestCheck.resultStatus || 'Scheduled';
        const isCurrentlyActive =
          (latestStatus === 'Scheduled' || latestStatus === 'Pending' || latestStatus === 'รอการยืนยัน') &&
          nowMs >= triggerTimeMs &&
          nowMs <= triggerTimeMs + 10 * 60 * 1000;

        const isFailed = checksInRound.some((s) => {
          const status = s.status || s.resultStatus || '';
          return status.includes('ไม่ผ่าน') || status.includes('ขาดการติดต่อ');
        });

        if (isCurrentlyActive) {
          const notifId = `spot_active_${id}`;
          dynamicNotifs.push({
            id: notifId,
            employee_id: session.employee_id,
            type: 'spotcheck',
            title: `🚨 สุ่มตรวจยืนยันตัวตน (รอบ${roundName})`,
            message: `ถึงเวลาสุ่มตรวจยืนยันตัวตนแล้ว กรุณาสแกนถ่ายภาพ Selfie ภายใน 10 นาที`,
            link: '/spotcheck',
            is_read: isNotifRead(notifId),
            created_at: new Date(triggerTimeMs).toISOString(),
          });
        } else if (isFailed && nowMs > triggerTimeMs + 10 * 60 * 1000) {
          const notifId = `spot_fail_${id}`;
          dynamicNotifs.push({
            id: notifId,
            employee_id: session.employee_id,
            type: 'spotcheck',
            title: `⚠️ ไม่ผ่านการสุ่มตรวจรอบ${roundName} (ขาดการติดต่อ)`,
            message: `คุณไม่ได้ยืนยันตัวตนตามเวลาที่กำหนด`,
            link: '/spotcheck',
            is_read: isNotifRead(notifId),
            created_at: new Date(triggerTimeMs).toISOString(),
          });
        }
      }
    } catch {
      // Ignore background gas fetch error
    }

    // 2. Afternoon Attendance Verification Notification (13:00 - 13:20) (Exempt for office and leave employees)
    try {
      const { hour: thHour, minute: thMin } = getThaiTime();

      if (
        !isOfficeToday &&
        todayDailyStatus.status === 'wfh' &&
        hasCheckedInWfhToday &&
        !hasVerifiedAfternoonToday &&
        thHour === 13 &&
        thMin >= 0 &&
        thMin <= 20
      ) {
        const notifId = `verify_afternoon_${todayStr}_${session.employee_id}`;
        dynamicNotifs.unshift({
          id: notifId,
          employee_id: session.employee_id,
          type: 'checkin',
          title: '📍 ถึงเวลายืนยันตัวตนช่วงบ่าย (13:00 น.)',
          message: 'กรุณาบันทึกพิกัด GPS และถ่ายภาพ Selfie ยืนยันการปฏิบัติงานช่วงบ่าย (13:00 - 13:20 น.)',
          link: '/checkin',
          is_read: isNotifRead(notifId),
          created_at: `${todayStr}T13:00:00+07:00`,
        });
      }
    } catch {}

    // Merge and deduplicate
    const combined = [...dynamicNotifs, ...memoryNotifs];
    const uniqueMap = new Map<string, AppNotification>();
    for (const n of combined) {
      if (!uniqueMap.has(n.id)) {
        uniqueMap.set(n.id, n);
      }
    }

    const notifications = Array.from(uniqueMap.values());
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    return NextResponse.json(
      { notifications, unreadCount },
      {
        headers: {
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=15',
        },
      }
    );
  } catch (error) {
    console.error('GET notifications error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงการแจ้งเตือน' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_id, mark_all, notif_ids } = body;

    const userNotifIds = new Set(
      getNotificationsForUser(session.employee_id, session.role).map((n) => n.id)
    );
    const isAllowedNotifId = (id: string) =>
      userNotifIds.has(id) ||
      id.startsWith('spot_active_') ||
      id.startsWith('spot_fail_') ||
      id.startsWith('spot_manual_') ||
      id.startsWith(`verify_afternoon_`);

    if (mark_all) {
      markNotificationsAsRead(session.employee_id, undefined, session.role);
      if (Array.isArray(notif_ids)) {
        notif_ids.forEach((id: string) => {
          if (typeof id === 'string' && isAllowedNotifId(id)) {
            markNotifIdAsRead(id);
          }
        });
      }
    } else if (notification_id && typeof notification_id === 'string') {
      if (isAllowedNotifId(notification_id)) {
        markNotifIdAsRead(notification_id);
      }
      markNotificationsAsRead(session.employee_id, notification_id, session.role);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH notifications error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตการแจ้งเตือน' }, { status: 500 });
  }
}

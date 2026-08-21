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

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const memoryNotifs = getNotificationsForUser(session.employee_id, session.role);
    const dynamicNotifs: AppNotification[] = [];

    // Fetch spotcheck logs to generate real-time notification items
    try {
      const gasRes = await callGAS('getLogs', { logType: 'spotcheck', limit: 100 });
      const rawSpotChecks = (gasRes?.data || []) as any[];
      const userChecks = rawSpotChecks.filter(
        (s) => String(s.employeeId) === String(session.employee_id) && s.date === todayStr
      );

      for (const s of userChecks) {
        const id = s.uuid || `${s.employeeId}_${s.date}_${s.round}`;
        const scheduledTime = s.triggeredTime || s.scheduledTime || s.time || (s.round === 'เช้า' ? '09:30:00' : '14:30:00');
        const triggerTimeMs = new Date(`${s.date || todayStr}T${scheduledTime}+07:00`).getTime();
        const nowMs = Date.now();

        const isCurrentlyActive =
          (s.status === 'Scheduled' || s.status === 'Pending' || s.status === 'รอการยืนยัน') &&
          nowMs >= triggerTimeMs &&
          nowMs <= triggerTimeMs + 10 * 60 * 1000;

        const isFailed = s.status && (s.status.includes('ไม่ผ่าน') || s.status.includes('ขาดการติดต่อ'));

        if (isCurrentlyActive) {
          const notifId = `spot_active_${id}`;
          dynamicNotifs.push({
            id: notifId,
            employee_id: session.employee_id,
            type: 'spotcheck',
            title: `🚨 สุ่มตรวจยืนยันตัวตน (รอบ${s.round})`,
            message: `ถึงเวลาสุ่มตรวจยืนยันตัวตนแล้ว กรุณาสแกนถ่ายภาพ Selfie ภายใน 10 นาที`,
            link: '/spotcheck',
            is_read: isNotifRead(notifId),
            created_at: new Date(triggerTimeMs).toISOString(),
          });
        } else if (isFailed) {
          const notifId = `spot_fail_${id}`;
          dynamicNotifs.push({
            id: notifId,
            employee_id: session.employee_id,
            type: 'spotcheck',
            title: `⚠️ ไม่ผ่านการสุ่มตรวจรอบ${s.round} (ขาดการติดต่อ)`,
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

    // 2. Afternoon Attendance Verification Notification (13:00 - 13:20) (Exempt for office employees)
    try {
      const thaiTimeStr = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Bangkok', hour12: false });
      const [thHourStr, thMinStr] = thaiTimeStr.split(':');
      const thHour = parseInt(thHourStr, 10);
      const thMin = parseInt(thMinStr, 10);

      // Check if employee checked in for WFH today (Only WFH checked-in employees get afternoon notification)
      let isCheckedInWfhToday = false;
      try {
        const checkinRes = await callGAS('getLogs', { logType: 'checkin', limit: 100 });
        const checkinLogs = (checkinRes?.data || []) as any[];
        const todayMorningCheckin = checkinLogs.find(
          (c) =>
            String(c.employeeId) === String(session.employee_id) &&
            c.date === todayStr &&
            c.type === 'เข้างาน'
        );
        if (
          todayMorningCheckin &&
          !(
            todayMorningCheckin.verificationStatus &&
            (todayMorningCheckin.verificationStatus.includes('ออฟฟิศ') || todayMorningCheckin.verificationStatus.includes('Office'))
          )
        ) {
          isCheckedInWfhToday = true;
        }
      } catch {}

      if (isCheckedInWfhToday && thHour === 13 && thMin >= 0 && thMin <= 20) {
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

    return NextResponse.json({ notifications, unreadCount });
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

    if (mark_all) {
      markNotificationsAsRead(session.employee_id, undefined, session.role);
      if (Array.isArray(notif_ids)) {
        notif_ids.forEach((id: string) => markNotifIdAsRead(id));
      }
    } else if (notification_id) {
      markNotifIdAsRead(notification_id);
      markNotificationsAsRead(session.employee_id, notification_id, session.role);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH notifications error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตการแจ้งเตือน' }, { status: 500 });
  }
}

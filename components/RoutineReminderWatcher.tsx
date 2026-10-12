'use client';

import { useEffect, useRef } from 'react';
import { getThaiTime, getThaiDateStr } from '@/lib/timeSync';
import { showNativeNotification } from '@/lib/clientNotification';
import { toast } from 'sonner';

/**
 * Global background watcher for routine daily work reminders:
 * 1. Morning Check-in: 08:00 - 08:30
 * 2. Afternoon Verification: 13:00 - 13:15
 * 3. Evening Report & Clock-out: 16:55 - 17:15
 */
export default function RoutineReminderWatcher() {
  const isFetchingRef = useRef(false);
  const memoryFlagsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const getReminderFlag = (key: string): boolean => {
      if (memoryFlagsRef.current.has(key)) return true;
      try {
        if (localStorage.getItem(key) === 'true') {
          memoryFlagsRef.current.add(key);
          return true;
        }
      } catch {}
      return false;
    };

    const setReminderFlag = (key: string) => {
      memoryFlagsRef.current.add(key);
      try {
        localStorage.setItem(key, 'true');
      } catch {}
    };

    const checkRoutineReminders = async () => {
      if (isFetchingRef.current) return;

      const now = new Date();
      // Check weekend (Bangkok timezone)
      const bkkDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', weekday: 'short' }).format(now);
      if (bkkDay === 'Sat' || bkkDay === 'Sun') return;

      const todayStr = getThaiDateStr(now);
      const { hour, minute } = getThaiTime(now);

      // 1. Morning Check-in Window (08:00 - 08:30)
      const isMorningWindow = hour === 8 && minute >= 0 && minute <= 30;
      const morningKey = `snu_routine_notif_${todayStr}_morning`;

      // 2. Afternoon Verification Window (13:00 - 13:15)
      const isAfternoonWindow = hour === 13 && minute >= 0 && minute <= 15;
      const afternoonKey = `snu_routine_notif_${todayStr}_afternoon`;

      // 3. Evening Clock-out & Daily Report Window (16:55 - 17:15)
      const isEveningWindow = (hour === 16 && minute >= 55) || (hour === 17 && minute <= 15);
      const eveningKey = `snu_routine_notif_${todayStr}_evening`;

      if (!isMorningWindow && !isAfternoonWindow && !isEveningWindow) {
        return;
      }

      // Check if this specific window has already alerted or been verified today on this device
      if (isMorningWindow && getReminderFlag(morningKey)) return;
      if (isAfternoonWindow && getReminderFlag(afternoonKey)) return;
      if (isEveningWindow && getReminderFlag(eveningKey)) return;

      isFetchingRef.current = true;
      try {
        const res = await fetch('/api/checkin?scope=self');
        if (!res.ok) return;
        const data = await res.json();

        // Exempt employees working at the office (face scan at company) or on leave/holiday
        const isOfficeToday = data.work_location_today === 'office' || data.resolved_daily_status === 'office';
        const isLeaveOrHoliday = data.resolved_daily_status === 'leave' || data.resolved_daily_status === 'leave_pending' || data.resolved_daily_status === 'holiday';
        if (isOfficeToday || isLeaveOrHoliday) {
          if (isMorningWindow) setReminderFlag(morningKey);
          if (isAfternoonWindow) setReminderFlag(afternoonKey);
          if (isEveningWindow) setReminderFlag(eveningKey);
          return;
        }

        const logs: any[] = data.logs || [];
        const todayLogs = logs.filter((l) => (l.date === todayStr || l.log_date === todayStr));

        // Process Morning Reminder
        if (isMorningWindow && !getReminderFlag(morningKey)) {
          const hasMorningCheckin = todayLogs.some((l) => (l.type === 'เข้างาน' || l.log_type === 'เข้างาน'));
          setReminderFlag(morningKey);
          if (!hasMorningCheckin) {
            await showNativeNotification({
              title: '⏰ แจ้งเตือนเวลาเข้างาน (Clock In)',
              body: 'ถึงเวลาลงเวลาปฏิบัติงานช่วงเช้าแล้ว (08:00 น.) กรุณาเปิดกล้อง Selfie สดเพื่อลงเวลาเข้างาน',
              url: '/checkin',
              sound: 'chime',
              tag: `routine_morning_${todayStr}`,
            });
            toast.info('⏰ ถึงเวลาลงเวลาเข้างานช่วงเช้า (08:00 น.) กรุณาลงเวลาเข้างานครับ', {
              duration: 8000,
            });
          }
        }

        // Process Afternoon Verification Reminder
        if (isAfternoonWindow && !getReminderFlag(afternoonKey)) {
          const hasAfternoonVerify = todayLogs.some((l) => (l.type === 'ยืนยันตัวตน' || l.log_type === 'ยืนยันตัวตน'));
          setReminderFlag(afternoonKey);
          if (!hasAfternoonVerify) {
            await showNativeNotification({
              title: '⏰ แจ้งเตือนยืนยันตัวตนรอบบ่าย (13:00 - 13:20 น.)',
              body: 'ถึงช่วงเวลายืนยันตัวตนระหว่างวันแล้ว กรุณาถ่ายภาพ Selfie ยืนยันตัวตนก่อนเวลา 13:20 น.',
              url: '/checkin',
              sound: 'chime',
              tag: `routine_afternoon_${todayStr}`,
            });
            toast.info('⏰ ถึงรอบเวลายืนยันตัวตนช่วงบ่าย (13:00 - 13:20 น.) กรุณายืนยันตัวตนครับ', {
              duration: 8000,
            });
          }
        }

        // Process Evening Clock-out & Daily Report Reminder
        if (isEveningWindow && !getReminderFlag(eveningKey)) {
          const hasEveningCheckout = todayLogs.some((l) => (l.type === 'ออกงาน' || l.log_type === 'ออกงาน'));
          setReminderFlag(eveningKey);
          if (!hasEveningCheckout) {
            await showNativeNotification({
              title: '📝 แจ้งเตือนส่งรายงานประจำวัน & ลงเวลาออกงาน',
              body: 'ใกล้ถึงเวลาสิ้นสุดการทำงาน (17:00 น.) กรุณาสรุปรายงานผลงานประจำวันและลงเวลาออกงาน',
              url: '/tasks',
              sound: 'chime',
              tag: `routine_evening_${todayStr}`,
            });
            toast.info('📝 อย่าลืมส่งรายงานสรุปผลงานประจำวันและลงเวลาออกงานครับ', {
              duration: 8000,
            });
          }
        }
      } catch (err) {
        console.warn('Routine reminder check error:', err);
      } finally {
        isFetchingRef.current = false;
      }
    };

    // Check on startup and interval every 60 seconds
    checkRoutineReminders();
    const interval = setInterval(checkRoutineReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  return null;
}

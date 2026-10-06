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
  const holidaysRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);

  // Load holidays once on mount
  useEffect(() => {
    fetch('/api/holidays')
      .then((res) => res.json())
      .then((data) => {
        const list: any[] = data.holidays || [];
        const set = new Set(list.filter((h) => h.is_active).map((h) => h.date));
        holidaysRef.current = set;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const checkRoutineReminders = async () => {
      if (isFetchingRef.current) return;

      const now = new Date();
      // Check weekend (Bangkok timezone)
      const bkkDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', weekday: 'short' }).format(now);
      if (bkkDay === 'Sat' || bkkDay === 'Sun') return;

      const todayStr = getThaiDateStr(now);
      // Skip on official company holidays
      if (holidaysRef.current.has(todayStr)) return;

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

      // Check if this specific window has already alerted today on this device
      if (isMorningWindow && localStorage.getItem(morningKey) === 'true') return;
      if (isAfternoonWindow && localStorage.getItem(afternoonKey) === 'true') return;
      if (isEveningWindow && localStorage.getItem(eveningKey) === 'true') return;

      isFetchingRef.current = true;
      try {
        const res = await fetch('/api/checkin?scope=self');
        if (!res.ok) return;
        const data = await res.json();
        const logs: any[] = data.logs || [];
        const todayLogs = logs.filter((l) => (l.date === todayStr || l.log_date === todayStr));

        // Process Morning Reminder
        if (isMorningWindow && localStorage.getItem(morningKey) !== 'true') {
          const hasMorningCheckin = todayLogs.some((l) => (l.type === 'เข้างาน' || l.log_type === 'เข้างาน'));
          if (!hasMorningCheckin) {
            localStorage.setItem(morningKey, 'true');
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
        if (isAfternoonWindow && localStorage.getItem(afternoonKey) !== 'true') {
          const hasAfternoonVerify = todayLogs.some((l) => (l.type === 'ยืนยันตัวตน' || l.log_type === 'ยืนยันตัวตน'));
          if (!hasAfternoonVerify) {
            localStorage.setItem(afternoonKey, 'true');
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
        if (isEveningWindow && localStorage.getItem(eveningKey) !== 'true') {
          const hasEveningCheckout = todayLogs.some((l) => (l.type === 'ออกงาน' || l.log_type === 'ออกงาน'));
          if (!hasEveningCheckout) {
            localStorage.setItem(eveningKey, 'true');
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

    // Check on startup and interval every 20 seconds
    checkRoutineReminders();
    const interval = setInterval(checkRoutineReminders, 20000);
    return () => clearInterval(interval);
  }, []);

  return null;
}

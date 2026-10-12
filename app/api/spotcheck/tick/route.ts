import { NextResponse } from 'next/server';
import { callGAS } from '@/lib/gas';
import { verifyCronAuth } from '@/lib/cron';
import { getThaiDateStr, getThaiTime } from '@/lib/timeSync';
import { getBangkokDayOfWeek } from '@/lib/scheduleStore';
import { resolveEmployeeDailyStatus } from '@/lib/dailyStatus';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    // Check if current time in Bangkok (ICT / UTC+7) is in lunch break (12:00 - 13:00)
    const now = new Date();
    const { hour: bkkHour } = getThaiTime(now);

    if (bkkHour === 12) {
      return NextResponse.json({
        success: true,
        message: 'ขณะนี้เวลา 12:00 - 13:00 น. (ช่วงพักเที่ยง Lunch Break) ยกเว้นการสุ่มตรวจอัตโนมัติ',
        skipped: true,
      });
    }

    const todayStr = getThaiDateStr(now);

    // Skip spot checks on weekends
    const bkkDayNum = getBangkokDayOfWeek(todayStr);
    if (bkkDayNum === 0 || bkkDayNum === 6) {
      return NextResponse.json({
        success: true,
        message: 'ขณะนี้เป็นวันหยุดสุดสัปดาห์ (เสาร์-อาทิตย์) ยกเว้นการสุ่มตรวจอัตโนมัติ',
        skipped: true,
        reason: 'weekend',
      });
    }

    // Skip spot checks on company/national holidays
    const { getHolidayByDate } = await import('@/lib/holidayStore');
    const holidayToday = getHolidayByDate(todayStr);
    if (holidayToday) {
      return NextResponse.json({
        success: true,
        message: `วันนี้เป็นวันหยุด (${holidayToday.name}) ยกเว้นการสุ่มตรวจอัตโนมัติ`,
        skipped: true,
        reason: 'holiday',
        holiday: holidayToday.name,
      });
    }

    const res = await callGAS('runScheduledSpotChecks');

    // Check for expired spot checks exceeding 10 minutes
    const nowMs = Date.now();
    const { getLiveEmployeesMap } = await import('@/lib/gas');
    const { createNotification, createNotificationForSupervisor } = await import('@/lib/notifications');
    const { sendMissedSpotCheckAlertEmail } = await import('@/lib/email');
    const { updateManualSpotCheck } = await import('@/lib/manualSpotCheckStore');

    const [employeesMap, spotRes, checkinRes] = await Promise.all([
      getLiveEmployeesMap(),
      callGAS('getLogs', { logType: 'spotcheck', limit: 50 }).catch(() => null),
      callGAS('getLogs', { logType: 'checkin', limit: 100 }).catch(() => null),
    ]);

    const wfhCheckedInSet = new Set<string>();
    const rawCheckins = (checkinRes?.data || []) as any[];
    for (const c of rawCheckins) {
      if (
        c.date === todayStr &&
        (c.type === 'เข้างาน' || c.log_type === 'เข้างาน') &&
        !String(c.note || '').includes('[ปฏิบัติงานที่ออฟฟิศ')
      ) {
        wfhCheckedInSet.add(String(c.employeeId));
      }
    }

    // 1. Check active test / manual spot checks
    if (global.__activeTestSpotChecks && global.__activeTestSpotChecks.length > 0) {
      for (const check of global.__activeTestSpotChecks) {
        if (check.result_status === 'Scheduled' || check.result_status === 'Pending') {
          const triggerTimeMs = check.created_at ? new Date(check.created_at).getTime() : 0;
          if (triggerTimeMs > 0 && nowMs > triggerTimeMs + 10 * 60 * 1000) {
            check.result_status = 'ไม่ผ่าน (ขาดการติดต่อ)';
            if (check.id) {
              updateManualSpotCheck(check.id, { result_status: 'ไม่ผ่าน (ขาดการติดต่อ)' });
            }

            const manualAlertKey = `alerted_missed_spot_${check.id || `${check.employee_id}_${check.check_date}_${check.scheduled_time}`}`;
            if (!(global as any)[manualAlertKey]) {
              (global as any)[manualAlertKey] = true;

              const emp = employeesMap[check.employee_id];
              const empName = emp?.name || check.employee_name || check.employee_id;
              const supervisorId = emp?.supervisorId;
              const supervisorEmail = supervisorId ? employeesMap[supervisorId]?.email : null;
              const adminEmail = employeesMap['9999']?.email || process.env.ADMIN_EMAIL || null;

              await Promise.all([
                supervisorId
                  ? createNotificationForSupervisor({
                      supervisor_id: supervisorId,
                      type: 'spotcheck',
                      title: `⚠️ พนักงานไม่ผ่านการสุ่มตรวจ: ${empName} (${check.employee_id})`,
                      message: `ขาดการติดต่อเกิน 10 นาที ในรอบการสุ่มตรวจ ${check.round}`,
                      link: '/supervisor',
                    })
                  : Promise.resolve(),
                createNotification({
                  employee_id: check.employee_id,
                  type: 'spotcheck',
                  title: '⚠️ คุณไม่ผ่านการสุ่มตรวจยืนยันตัวตน',
                  message: `คุณไม่ได้ถ่ายภาพยืนยันตัวตนภายใน 10 นาที (รอบ ${check.round}) สถานะ: ไม่ผ่าน (ขาดการติดต่อ)`,
                  link: '/spotcheck',
                }),
                sendMissedSpotCheckAlertEmail({
                  employeeName: empName,
                  employeeId: check.employee_id,
                  department: emp?.dept,
                  round: check.round,
                  scheduledTime: check.scheduled_time,
                  supervisorEmail,
                  adminEmail,
                  employeeEmail: emp?.email,
                }),
              ]);
            }
          }
        }
      }
    }

    // 2. Check scheduled spot check logs from Google Apps Script
    try {
      const rawSpotLogs = (spotRes?.data || []) as any[];
      for (const s of rawSpotLogs) {
        if (s.date === todayStr) {
          const empIdStr = String(s.employeeId);
          // Check resolved daily status (Leave, Holiday, Office vs WFH)
          const dailyStatus = resolveEmployeeDailyStatus(empIdStr, todayStr, {
            hasCheckedInWfhToday: wfhCheckedInSet.has(empIdStr),
          });
          const isRoutine = !s.round || s.round.includes('เช้า') || s.round.includes('บ่าย') || s.round.includes('ประจำวัน');
          if (dailyStatus.isExemptFromRoutineSpotCheck && isRoutine) {
            continue;
          }

          const status = s.status || s.resultStatus || 'Scheduled';
          const isPending = status === 'Scheduled' || status === 'Pending' || status === 'รอการยืนยัน';
          if (isPending && !s.actualScanTime && !s.checkInTime) {
            const scheduledTime = s.triggeredTime || s.scheduledTime || s.time;
            if (scheduledTime) {
              const triggerTimeMs = new Date(`${s.date}T${scheduledTime}+07:00`).getTime();
              if (!isNaN(triggerTimeMs) && nowMs > triggerTimeMs + 10 * 60 * 1000) {
                const alertKey = `alerted_missed_spot_${s.employeeId}_${s.date}_${s.round || scheduledTime}`;
                if (!(global as any)[alertKey]) {
                  (global as any)[alertKey] = true;

                  const emp = employeesMap[String(s.employeeId)];
                  const empName = emp?.name || s.name || String(s.employeeId);
                  const supervisorId = emp?.supervisorId;
                  const supervisorEmail = supervisorId ? employeesMap[supervisorId]?.email : null;
                  const adminEmail = employeesMap['9999']?.email || process.env.ADMIN_EMAIL || null;

                  await Promise.all([
                    supervisorId
                      ? createNotificationForSupervisor({
                          supervisor_id: supervisorId,
                          type: 'spotcheck',
                          title: `⚠️ พนักงานไม่ผ่านการสุ่มตรวจ: ${empName} (${s.employeeId})`,
                          message: `ขาดการติดต่อเกิน 10 นาที ในรอบการสุ่มตรวจ ${s.round || 'ประจำวัน'}`,
                          link: '/supervisor',
                        })
                      : Promise.resolve(),
                    createNotification({
                      employee_id: String(s.employeeId),
                      type: 'spotcheck',
                      title: '⚠️ คุณไม่ผ่านการสุ่มตรวจยืนยันตัวตน',
                      message: `คุณไม่ได้ถ่ายภาพยืนยันตัวตนภายใน 10 นาที (รอบ ${s.round || 'ประจำวัน'}) สถานะ: ไม่ผ่าน (ขาดการติดต่อ)`,
                      link: '/spotcheck',
                    }),
                    sendMissedSpotCheckAlertEmail({
                      employeeName: empName,
                      employeeId: String(s.employeeId),
                      department: emp?.dept,
                      round: s.round || 'ประจำวัน',
                      scheduledTime: scheduledTime,
                      supervisorEmail,
                      adminEmail,
                      employeeEmail: emp?.email,
                    }),
                  ]);
                }
              }
            }
          }
        }
      }
    } catch (checkErr) {
      console.warn('Failed checking expired spot checks:', checkErr);
    }

    return NextResponse.json({
      success: true,
      result: res,
    });
  } catch (error: any) {
    console.error('SpotCheck tick error:', error);
    return NextResponse.json({ error: error?.message || 'SpotCheck tick failed' }, { status: 500 });
  }
}

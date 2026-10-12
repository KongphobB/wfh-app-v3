import { NextResponse } from 'next/server';
import { callGAS, getLiveEmployeesMap } from '@/lib/gas';
import { verifyCronAuth } from '@/lib/cron';
import { createNotification, createNotificationForAdmins, createNotificationForSupervisor } from '@/lib/notifications';
import { sendMissingCheckinAlertEmail, sendAbsentAlertEmail } from '@/lib/email';
import { resolveEmployeeDailyStatus } from '@/lib/dailyStatus';
import { getHolidayByDate } from '@/lib/holidayStore';
import { getThaiDateStr, getThaiTime } from '@/lib/timeSync';
import { getBangkokDayOfWeek } from '@/lib/scheduleStore';
import { applyCheckinAdjustments } from '@/lib/checkinAdjustmentStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const todayStr = getThaiDateStr();

    // 1. Skip on weekends (Saturday / Sunday) in Bangkok timezone
    const bkkDayNum = getBangkokDayOfWeek(todayStr);
    if (bkkDayNum === 0 || bkkDayNum === 6) {
      return NextResponse.json({
        success: true,
        message: 'วันนี้เป็นวันหยุดสุดสัปดาห์ (เสาร์-อาทิตย์) ยกเว้นการตรวจสอบการลงเวลาและการส่งแจ้งเตือนขาดงาน',
        skipped: true,
        reason: 'weekend',
      });
    }

    // 2. Skip on registered official / company holidays
    const holidayToday = getHolidayByDate(todayStr);
    if (holidayToday) {
      return NextResponse.json({
        success: true,
        message: `วันนี้เป็นวันหยุด (${holidayToday.name}) ยกเว้นการตรวจสอบการลงเวลาและการส่งแจ้งเตือนขาดงาน`,
        skipped: true,
        reason: 'holiday',
        holiday: holidayToday.name,
      });
    }

    const [employeesMap, checkinRes] = await Promise.all([
      getLiveEmployeesMap(),
      callGAS('getLogs', { logType: 'checkin', limit: 200 }),
    ]);
    const checkinLogs = applyCheckinAdjustments((checkinRes?.data || []) as any[]);

    // Set of employee IDs who have checked in today
    const checkedInEmpIds = new Set(
      checkinLogs
        .filter((c) => c.date === todayStr && (c.type === 'เข้างาน' || c.log_type === 'เข้างาน'))
        .map((c) => String(c.employeeId || c.employee_id))
    );

    const notifiedEmployees: { id: string; name: string; email?: string }[] = [];

    const { hour: currentHour } = getThaiTime();
    const isAfternoonAbsent = currentHour >= 12;

    for (const [empId, emp] of Object.entries(employeesMap)) {
      if (
        empId === '9999' ||
        empId === '9988' ||
        empId.startsWith('qa_') ||
        empId.startsWith('test_') ||
        String(emp?.dept || '').toLowerCase() === 'testmail' ||
        checkedInEmpIds.has(empId)
      ) {
        continue;
      }

      // Check daily status resolution (Holiday, Leave, Pending Leave, Office vs WFH)
      const dailyStatus = resolveEmployeeDailyStatus(empId, todayStr);
      if (dailyStatus.isExemptFromMissingCheckin) {
        continue;
      }

      // Deduplicate: Send at most ONE alert per employee per window per day
      const alertKey = isAfternoonAbsent
        ? `alerted_absent_${empId}_${todayStr}`
        : `alerted_missing_checkin_${empId}_${todayStr}`;

      if ((global as any)[alertKey]) {
        continue;
      }
      (global as any)[alertKey] = true;

      notifiedEmployees.push({
        id: empId,
        name: emp.name || empId,
        email: emp.email,
      });

      const supervisorEmail = emp.supervisorId ? employeesMap[emp.supervisorId]?.email : null;
      const adminEmail = employeesMap['9999']?.email || process.env.ADMIN_EMAIL || null;

      if (isAfternoonAbsent) {
        await Promise.all([
          // 1. In-app notification to employee (Absent status)
          createNotification({
            employee_id: empId,
            type: 'warning',
            title: '🚫 ยังไม่พบการลงเวลาเข้างาน (เลยเวลา 12:00 น. ถือเป็นขาดงาน)',
            message: 'ระบบไม่พบการลงเวลาปฏิบัติงานตลอดช่วงเช้าของคุณ กรุณาติดต่อหัวหน้างานหรือยื่นคำขอลาย้อนหลัง',
            link: '/checkin',
          }),
          // 2. In-app notification to supervisor
          emp.supervisorId
            ? createNotificationForSupervisor({
                supervisor_id: emp.supervisorId,
                type: 'warning',
                title: `🚫 พนักงานขาดงาน: ${emp.name} (${empId})`,
                message: `พนักงานยังไม่ลงเวลาปฏิบัติงานตลอดช่วงเช้า (เกินเวลา 12:00 น. ช่วงพักเที่ยง)`,
                link: '/supervisor',
              })
            : Promise.resolve(),
          // 2.1 In-app notification to admin
          createNotificationForAdmins({
            type: 'warning',
            title: `🚫 พนักงานขาดงาน: ${emp.name} (${empId})`,
            message: `พนักงานยังไม่ลงเวลาปฏิบัติงานตลอดช่วงเช้า (เกินเวลา 12:00 น. ช่วงพักเที่ยง)`,
            link: '/admin',
          }),
          // 3. Email alert to BOTH supervisor and admin (and CC employee)
          sendAbsentAlertEmail({
            employeeName: emp.name || empId,
            employeeId: empId,
            department: emp.dept,
            supervisorEmail,
            adminEmail,
            employeeEmail: emp.email,
          }),
        ]);
      } else {
        await Promise.all([
          // 1. In-app notification to employee (Morning late reminder)
          createNotification({
            employee_id: empId,
            type: 'warning',
            title: '⚠️ ยังไม่ได้ลงเวลาเข้างานช่วงเช้า (หลัง 08:00 น.)',
            message: 'ระบบตรวจพบว่าคุณยังไม่ได้ลงเวลาเข้างานช่วงเช้า กรุณาลงเวลาและระบุเหตุผลความจำเป็นในช่องหมายเหตุ',
            link: '/checkin',
          }),
          // 2. In-app notification to supervisor
          emp.supervisorId
            ? createNotificationForSupervisor({
                supervisor_id: emp.supervisorId,
                type: 'warning',
                title: `⚠️ พนักงานยังไม่ลงเวลาเข้างาน: ${emp.name} (${empId})`,
                message: `พนักงานยังไม่ได้ลงเวลาเข้างานช่วงเช้า (เกินกำหนด 08:00 น.)`,
                link: '/supervisor',
              })
            : Promise.resolve(),
          // 2.1 In-app notification to admin
          createNotificationForAdmins({
            type: 'warning',
            title: `⚠️ พนักงานยังไม่ลงเวลาเข้างาน: ${emp.name} (${empId})`,
            message: `พนักงานยังไม่ได้ลงเวลาเข้างานช่วงเช้า (เกินกำหนด 08:00 น.)`,
            link: '/admin',
          }),
          // 3. Email alert to BOTH supervisor and admin (and CC employee)
          sendMissingCheckinAlertEmail({
            employeeName: emp.name || empId,
            employeeId: empId,
            department: emp.dept,
            supervisorEmail,
            adminEmail,
            employeeEmail: emp.email,
          }),
        ]);
      }
    }

    return NextResponse.json({
      success: true,
      time: '08:00',
      notifiedCount: notifiedEmployees.length,
      notifiedEmployees,
    });
  } catch (error: any) {
    console.error('Missing checkin tick error:', error);
    return NextResponse.json({ error: error?.message || 'Tick failed' }, { status: 500 });
  }
}

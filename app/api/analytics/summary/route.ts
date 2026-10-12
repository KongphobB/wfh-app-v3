import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS, getLiveEmployeesMap } from '@/lib/gas';
import { getLeaveRequestsForUser } from '@/lib/leaveStore';
import { AnalyticsSummary } from '@/types';
import { getThaiDateStr } from '@/lib/timeSync';
import { applyCheckinAdjustments } from '@/lib/checkinAdjustmentStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get('employee_id');
    const canPreDetermineTarget = !requestedId || session.role === 'admin' || session.role === 'employee';
    const initialTargetId =
      requestedId && session.role === 'admin' ? requestedId : String(session.employee_id);

    const [employeesMap, preFetchedSummary] = await Promise.all([
      getLiveEmployeesMap(),
      canPreDetermineTarget
        ? callGAS('getDashboardSummary', { employeeId: initialTargetId })
        : Promise.resolve(null),
    ]);

    // Determine list of accessible employees for this user
    let accessibleEmployees: {
      id: string;
      name: string;
      dept: string;
      position: string;
      isSelf: boolean;
    }[] = [];

    const isSystemOrTestAccount = (id: string, emp: any) =>
      id !== String(session.employee_id) &&
      (id === '9988' ||
        id.startsWith('qa_') ||
        id.startsWith('test_') ||
        String(emp?.dept || '').toLowerCase() === 'testmail');

    if (session.role === 'admin') {
      accessibleEmployees = Object.entries(employeesMap)
        .filter(([id, emp]) => !isSystemOrTestAccount(id, emp))
        .map(([id, emp]) => ({
          id,
          name: emp.name || id,
          dept: emp.dept || '',
          position: emp.position || '',
          isSelf: id === String(session.employee_id),
        }));
    } else if (session.role === 'supervisor') {
      const teamEntries = Object.entries(employeesMap).filter(
        ([id, emp]) =>
          !isSystemOrTestAccount(id, emp) &&
          (String(emp.supervisorId) === String(session.employee_id) || id === String(session.employee_id))
      );

      accessibleEmployees = teamEntries.map(([id, emp]) => ({
        id,
        name: emp.name || id,
        dept: emp.dept || '',
        position: emp.position || '',
        isSelf: id === String(session.employee_id),
      }));
    } else {
      accessibleEmployees = [
        {
          id: String(session.employee_id),
          name: session.name,
          dept: session.department || '',
          position: '',
          isSelf: true,
        },
      ];
    }

    let targetEmployeeId = String(session.employee_id);

    if (requestedId && (session.role === 'admin' || session.role === 'supervisor')) {
      const hasAccess = session.role === 'admin' || accessibleEmployees.some((e) => e.id === requestedId);
      if (hasAccess) {
        targetEmployeeId = requestedId;
      }
    }

    // Fetch unified dashboard data for this employee (reuse preFetchedSummary if target matches)
    const res =
      canPreDetermineTarget && targetEmployeeId === initialTargetId && preFetchedSummary
        ? preFetchedSummary
        : await callGAS('getDashboardSummary', { employeeId: targetEmployeeId });
    if (!res || !res.success) {
      return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลสถิติได้' }, { status: 500 });
    }

    const allMorningCheckins = (applyCheckinAdjustments((res.checkinLogs || []) as any[])).filter(
      (l) => String(l.employeeId) === String(targetEmployeeId) && (l.type === 'เข้างาน' || l.log_type === 'เข้างาน')
    );
    // Deduplicate morning check-ins by date (keep earliest per date)
    const checkinByDateMap = new Map<string, any>();
    for (const c of allMorningCheckins) {
      const dKey = String(c.date || c.log_date || '');
      if (!dKey) continue;
      const existing = checkinByDateMap.get(dKey);
      if (!existing || String(c.time || '') < String(existing.time || '')) {
        checkinByDateMap.set(dKey, c);
      }
    }
    const rawCheckins = Array.from(checkinByDateMap.values());

    const rawTasks = ((res.tasks || []) as any[]).filter(
      (t) => String(t.employeeId) === String(targetEmployeeId)
    );
    const rawSpots = ((res.spotChecks || []) as any[]).filter(
      (s) => String(s.employeeId) === String(targetEmployeeId)
    );
    const ABSENCE_LEAVE_TYPES = new Set(['ลาป่วย', 'ลากิจ', 'ลาพักร้อน']);
    const rawLeaves = getLeaveRequestsForUser(targetEmployeeId, 'employee').filter(
      (l) => l.status === 'Approved' && ABSENCE_LEAVE_TYPES.has(l.leave_type)
    );
    const leaveDaysCount = rawLeaves.reduce((sum, l) => {
      const startMs = new Date(`${l.start_date}T00:00:00+07:00`).getTime();
      const endMs = new Date(`${l.end_date}T00:00:00+07:00`).getTime();
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
        return sum + Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
      }
      return sum + 1;
    }, 0);

    // 1. Calculate On-Time Attendance
    let onTimeCount = 0;
    let lateCount = 0;

    rawCheckins.forEach((c) => {
      const timeStr = c.time || '';
      const [hStr, mStr] = timeStr.split(':');
      const hour = parseInt(hStr, 10) || 0;
      const min = parseInt(mStr, 10) || 0;
      if (hour < 8 || (hour === 8 && min === 0)) {
        onTimeCount++;
      } else {
        lateCount++;
      }
    });

    const totalCheckins = onTimeCount + lateCount;
    const onTimeRate = totalCheckins > 0 ? Math.round((onTimeCount / totalCheckins) * 100) : 100;

    // 2. Calculate Star Rating Distribution & Average
    const starDistribution: { [star: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalStarSum = 0;
    let totalRatedCount = 0;

    rawTasks.forEach((t) => {
      const rating = parseInt(t.starRating || t.rating, 10);
      if (rating >= 1 && rating <= 5) {
        starDistribution[rating] = (starDistribution[rating] || 0) + 1;
        totalStarSum += rating;
        totalRatedCount++;
      }
    });

    const avgStarRating = totalRatedCount > 0 ? Number((totalStarSum / totalRatedCount).toFixed(1)) : 5.0;

    // 3. Task Completion Rate
    let totalAssigned = 0;
    let totalCompleted = 0;

    rawTasks.forEach((t) => {
      const assigned = parseInt(t.assignedTasks || t.tasksAssigned || t.assigned || 1, 10) || 1;
      const completed = parseInt(t.completedTasks || t.tasksCompleted || t.completed || 0, 10) || 0;
      totalAssigned += assigned;
      totalCompleted += completed;
    });

    const taskCompletionRate = totalAssigned > 0 ? Math.min(100, Math.round((totalCompleted / totalAssigned) * 100)) : 100;

    // 4. Spot Check Compliance (deduplicate by date + round and normalize GAS status fields)
    const isSpotPassed = (s: any) => {
      const status = String(s.status || s.resultStatus || '');
      return (
        status === 'Pass' ||
        status === 'ผ่าน' ||
        status.includes('ผ่านการสุ่มตรวจ') ||
        Boolean(s.actualScanTime || s.checkInTime)
      );
    };
    const isSpotPending = (s: any) => {
      const status = String(s.status || s.resultStatus || 'Scheduled');
      return (status === 'Scheduled' || status === 'Pending' || status === 'รอการยืนยัน') && !isSpotPassed(s);
    };

    const dedupedSpotRounds = new Map<string, any>();
    for (const s of rawSpots) {
      const key = `${s.date || ''}_${s.round || 'เช้า'}`;
      const existing = dedupedSpotRounds.get(key);
      if (!existing || (!isSpotPassed(existing) && isSpotPassed(s))) {
        dedupedSpotRounds.set(key, s);
      }
    }

    let spotPassCount = 0;
    let spotTotalCount = 0;
    const todayDateStr = getThaiDateStr();
    const nowTimeMs = Date.now();

    dedupedSpotRounds.forEach((s) => {
      if (isSpotPassed(s)) {
        spotPassCount++;
        spotTotalCount++;
        return;
      }
      if (isSpotPending(s) && s.date === todayDateStr) {
        const rawSched = String(s.triggeredTime || s.scheduledTime || s.time || '').trim();
        const m = rawSched.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        const normTime = m ? `${m[1].padStart(2, '0')}:${m[2]}:${m[3] || '00'}` : '23:59:59';
        const trigMs = new Date(`${s.date}T${normTime}+07:00`).getTime();
        // Do not penalize an employee for a spot check that hasn't expired yet today
        if (!isNaN(trigMs) && nowTimeMs <= trigMs + 11 * 60 * 1000) {
          return;
        }
      }
      spotTotalCount++;
    });

    const spotCheckComplianceRate = spotTotalCount > 0 ? Math.round((spotPassCount / spotTotalCount) * 100) : 100;

    // 5. Daily Trends (Last 7 days)
    const { resolveEmployeeDailyStatus } = await import('@/lib/dailyStatus');
    const { getBangkokDayOfWeek } = await import('@/lib/scheduleStore');
    const { getThaiTime } = await import('@/lib/timeSync');
    const dailyTrends = [];
    const now = new Date();
    const { hour: currentBkkHour, minute: currentBkkMin } = getThaiTime(now);
    const isPastMorningDeadline = currentBkkHour > 8 || (currentBkkHour === 8 && currentBkkMin > 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = getThaiDateStr(d);
      const dayName = d.toLocaleDateString('th-TH', { weekday: 'short', timeZone: 'Asia/Bangkok' });

      const checkinToday = rawCheckins.find((c) => c.date === dateStr);
      const isOfficeCheckin = Boolean(
        checkinToday &&
          (String(checkinToday.note || '').includes('ปฏิบัติงานที่ออฟฟิศ') ||
            String(checkinToday.verificationStatus || checkinToday.verification_status || '').includes('ออฟฟิศ'))
      );
      const hasCheckedInWfhToday = Boolean(checkinToday && !isOfficeCheckin);
      const isLeaveToday = rawLeaves.some((l) => l.start_date <= dateStr && dateStr <= l.end_date);
      const taskToday = rawTasks.find((t) => (t.date || t.submitDate) === dateStr);
      const star = taskToday ? parseInt(taskToday.starRating || taskToday.rating, 10) || null : null;
      const dailyDetail = resolveEmployeeDailyStatus(targetEmployeeId, dateStr, {
        hasCheckedInWfhToday,
        isOfficeCheckin,
      });
      const bkkDay = getBangkokDayOfWeek(dateStr);

      let status: 'on-time' | 'late' | 'leave' | 'missing' | 'none' = 'none';
      if (dailyDetail.status === 'holiday') {
        status = 'none';
      } else if (isLeaveToday || dailyDetail.status === 'leave') {
        status = 'leave';
      } else if (checkinToday) {
        const timeStr = checkinToday.time || '';
        const [h, m] = timeStr.split(':').map((x: string) => parseInt(x, 10));
        status = h < 8 || (h === 8 && m === 0) ? 'on-time' : 'late';
      } else if (dailyDetail.location === 'office' || dailyDetail.isExemptFromMissingCheckin) {
        status = 'leave';
      } else if (bkkDay !== 0 && bkkDay !== 6 && (i > 0 || isPastMorningDeadline)) {
        status = 'missing';
      }

      const [, mPart, dPart] = dateStr.split('-');
      dailyTrends.push({
        date: dateStr,
        dayLabel: `${dayName} ${parseInt(dPart, 10)}/${parseInt(mPart, 10)}`,
        checkinStatus: status,
        checkinTime: checkinToday?.time || null,
        starRating: star,
        tasksCount: taskToday
          ? parseInt(taskToday.completedTasks || taskToday.tasksCompleted || taskToday.completed || 0, 10)
          : 0,
      });
    }

    const summary: AnalyticsSummary = {
      period: 'รอบเดือนปัจจุบัน',
      totalWorkdays: totalCheckins + leaveDaysCount,
      onTimeCheckinCount: onTimeCount,
      lateCheckinCount: lateCount,
      onTimeRate,
      avgStarRating,
      totalRatingsCount: totalRatedCount,
      totalTasksAssigned: totalAssigned,
      totalTasksCompleted: totalCompleted,
      taskCompletionRate,
      spotCheckPassCount: spotPassCount,
      spotCheckTotalCount: spotTotalCount,
      spotCheckComplianceRate,
      leaveDaysCount,
      starDistribution,
      dailyTrends,
    };

    const targetEmpInfo = employeesMap[targetEmployeeId];
    const targetEmpName =
      targetEmpInfo?.name || (targetEmployeeId === String(session.employee_id) ? session.name : targetEmployeeId);

    return NextResponse.json({
      success: true,
      data: summary,
      employee: {
        id: targetEmployeeId,
        name: targetEmpName,
        department: targetEmpInfo?.dept || '',
        position: targetEmpInfo?.position || '',
      },
      accessibleEmployees,
      userRole: session.role,
    });
  } catch (error: any) {
    console.error('Analytics summary error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to generate analytics summary' }, { status: 500 });
  }
}

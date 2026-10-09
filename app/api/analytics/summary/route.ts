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

    const employeesMap = await getLiveEmployeesMap();

    // Determine list of accessible employees for this user
    let accessibleEmployees: {
      id: string;
      name: string;
      dept: string;
      position: string;
      isSelf: boolean;
    }[] = [];

    if (session.role === 'admin') {
      accessibleEmployees = Object.entries(employeesMap).map(([id, emp]) => ({
        id,
        name: emp.name || id,
        dept: emp.dept || '',
        position: emp.position || '',
        isSelf: id === String(session.employee_id),
      }));
    } else if (session.role === 'supervisor') {
      const teamEntries = Object.entries(employeesMap).filter(
        ([id, emp]) => String(emp.supervisorId) === String(session.employee_id) || id === String(session.employee_id)
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

    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get('employee_id');
    let targetEmployeeId = String(session.employee_id);

    if (requestedId && (session.role === 'admin' || session.role === 'supervisor')) {
      const hasAccess = session.role === 'admin' || accessibleEmployees.some((e) => e.id === requestedId);
      if (hasAccess) {
        targetEmployeeId = requestedId;
      }
    }

    // Fetch unified dashboard data for this employee
    const res = await callGAS('getDashboardSummary', { employeeId: targetEmployeeId });
    if (!res || !res.success) {
      return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลสถิติได้' }, { status: 500 });
    }

    const rawCheckins = (applyCheckinAdjustments((res.checkinLogs || []) as any[])).filter(
      (l) => String(l.employeeId) === String(targetEmployeeId) && (l.type === 'เข้างาน' || l.log_type === 'เข้างาน')
    );
    const rawTasks = ((res.tasks || []) as any[]).filter(
      (t) => String(t.employeeId) === String(targetEmployeeId)
    );
    const rawSpots = ((res.spotChecks || []) as any[]).filter(
      (s) => String(s.employeeId) === String(targetEmployeeId)
    );
    const rawLeaves = getLeaveRequestsForUser(targetEmployeeId, 'employee').filter((l) => l.status === 'Approved');

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
      const assigned = parseInt(t.tasksAssigned || t.assigned || 1, 10) || 1;
      const completed = parseInt(t.tasksCompleted || t.completed || 0, 10) || 0;
      totalAssigned += assigned;
      totalCompleted += completed;
    });

    const taskCompletionRate = totalAssigned > 0 ? Math.min(100, Math.round((totalCompleted / totalAssigned) * 100)) : 100;

    // 4. Spot Check Compliance
    let spotPassCount = 0;
    let spotTotalCount = rawSpots.length;

    rawSpots.forEach((s) => {
      const status = s.resultStatus || '';
      if (status === 'Pass' || status.includes('ผ่านการสุ่มตรวจ')) {
        spotPassCount++;
      }
    });

    const spotCheckComplianceRate = spotTotalCount > 0 ? Math.round((spotPassCount / spotTotalCount) * 100) : 100;

    // 5. Daily Trends (Last 7 days)
    const { resolveEmployeeDailyStatus } = await import('@/lib/dailyStatus');
    const dailyTrends = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = getThaiDateStr(d);
      const dayName = d.toLocaleDateString('th-TH', { weekday: 'short', timeZone: 'Asia/Bangkok' });

      const checkinToday = rawCheckins.find((c) => c.date === dateStr);
      const isLeaveToday = rawLeaves.some((l) => l.start_date <= dateStr && dateStr <= l.end_date);
      const taskToday = rawTasks.find((t) => (t.date || t.submitDate) === dateStr);
      const star = taskToday ? parseInt(taskToday.starRating || taskToday.rating, 10) || null : null;
      const dailyDetail = resolveEmployeeDailyStatus(targetEmployeeId, dateStr);

      let status: 'on-time' | 'late' | 'leave' | 'missing' | 'none' = 'none';
      if (dailyDetail.status === 'holiday') {
        status = 'none';
      } else if (isLeaveToday || dailyDetail.status === 'leave') {
        status = 'leave';
      } else if (checkinToday) {
        const timeStr = checkinToday.time || '';
        const [h, m] = timeStr.split(':').map((x: string) => parseInt(x, 10));
        status = h < 8 || (h === 8 && m === 0) ? 'on-time' : 'late';
      } else if (dailyDetail.location === 'office') {
        status = 'leave';
      } else if (d.getDay() !== 0 && d.getDay() !== 6 && i > 0) {
        status = 'missing';
      }

      dailyTrends.push({
        date: dateStr,
        dayLabel: `${dayName} ${d.getDate()}/${d.getMonth() + 1}`,
        checkinStatus: status,
        checkinTime: checkinToday?.time || null,
        starRating: star,
        tasksCount: taskToday ? parseInt(taskToday.tasksCompleted || taskToday.completed || 0, 10) : 0,
      });
    }

    const summary: AnalyticsSummary = {
      period: 'รอบเดือนปัจจุบัน',
      totalWorkdays: totalCheckins + rawLeaves.length,
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
      leaveDaysCount: rawLeaves.length,
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

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS } from '@/lib/gas';
import { CheckinLog, TaskItem, SpotCheck } from '@/types';
import { getThaiDateStr } from '@/lib/timeSync';
import { applyCheckinAdjustments } from '@/lib/checkinAdjustmentStore';
import { getSelfiePhoto } from '@/lib/photoStore';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const todayStr = getThaiDateStr();

    // Fetch unified dashboard data from Google Sheets in ONE single call
    const res = await callGAS('getDashboardSummary', { employeeId: session.employee_id });
    if (!res || !res.success) {
      return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลแดชบอร์ดได้' }, { status: 500 });
    }

    const employeesMap = res.config?.employeesMap || {};
    const rawCheckins = applyCheckinAdjustments((res.checkinLogs || []) as any[]);
    const rawTasks = (res.tasks || []) as any[];
    const rawSpots = (res.spotChecks || []) as any[];

    const normalizeTimeStr = (rawTime: unknown, fallback = '08:00:00'): string => {
      if (!rawTime || typeof rawTime !== 'string') return fallback;
      const clean = rawTime.includes('T')
        ? rawTime.split('T')[1]?.split('+')[0]?.split('Z')[0] || fallback
        : rawTime.trim();
      const parts = clean.split(':');
      if (parts.length === 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
      }
      if (parts.length >= 3) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].substring(0, 2).padStart(2, '0')}`;
      }
      return fallback;
    };

    // 1. Format Checkin Logs (Filter for self today)
    const selfCheckins = rawCheckins.filter(
      (l) => String(l.employeeId) === String(session.employee_id) && l.date === todayStr
    );

    const formattedCheckins: CheckinLog[] = selfCheckins.map((l) => {
      const timeFormatted = normalizeTimeStr(l.time, '08:00:00');
      const isoTimeStr = `${l.date}T${timeFormatted}+07:00`;
      let photoUrl = getSelfiePhoto([
        l.photo,
        l.photoUrl,
        l.uuid,
        `${l.employeeId}_${l.date}_${l.time}`,
        `${l.employeeId}_${l.date}_${l.type}`,
      ]);
      if (!photoUrl && l.uuid && (l.hasPhoto === true || Boolean(l.photo))) {
        photoUrl = `/api/checkin/photo?uuid=${encodeURIComponent(l.uuid)}&type=checkin`;
      }

      return {
        id: l.uuid || `${l.employeeId}_${l.date}_${l.time}`,
        employee_id: String(l.employeeId),
        employee_name: l.name || session.name,
        log_type: l.type || 'เข้างาน',
        log_date: l.date,
        log_time: isoTimeStr,
        gps_lat: null,
        gps_lng: null,
        photo_url: photoUrl,
        has_photo: l.hasPhoto === true || Boolean(photoUrl),
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
      const assigned = parseInt(t.assignedTasks || t.tasksAssigned || t.assigned || 1, 10);
      const completed = parseInt(t.completedTasks || t.tasksCompleted || t.completed || 0, 10);
      const remaining =
        t.remainingTasks != null || t.tasksRemaining != null
          ? parseInt(t.remainingTasks || t.tasksRemaining, 10)
          : Math.max(0, assigned - completed);
      return {
        id: t.uuid || `${t.employeeId}_${t.date}`,
        submit_date: t.date || t.submitDate,
        employee_id: String(t.employeeId),
        employee_name: t.name || session.name,
        tasks_assigned: assigned,
        tasks_completed: completed,
        tasks_remaining: remaining,
        details: t.details || t.taskDetails || '',
        submission_link: t.submissionLink || t.link || null,
        star_rating: starRating && !isNaN(starRating) ? starRating : null,
        supervisor_note: t.supervisorNote || t.supervisorNotes || t.note || null,
        created_at: `${t.date || todayStr}T09:00:00+07:00`,
      };
    });

    // 3. Format Spot Checks (Filter for self today)
    const selfSpots = rawSpots.filter(
      (s) => String(s.employeeId) === String(session.employee_id) && s.date === todayStr
    );
    const rawFormattedSpots: SpotCheck[] = selfSpots.map((s) => {
      const fallbackTime = s.round === 'เช้า' ? '09:30:00' : '14:30:00';
      const scheduledTime = normalizeTimeStr(
        s.triggeredTime || s.scheduledTime || s.time || fallbackTime,
        fallbackTime
      );
      const rawStatus = s.status || s.resultStatus || 'Scheduled';
      const scanTimeRaw = s.checkInTime || s.actualScanTime || null;
      let actualScanTimeFormatted: string | null = null;
      if (scanTimeRaw) {
        actualScanTimeFormatted =
          typeof scanTimeRaw === 'string' && scanTimeRaw.includes('T')
            ? scanTimeRaw
            : `${s.date || todayStr}T${normalizeTimeStr(scanTimeRaw, scheduledTime)}+07:00`;
      }
      const isCompletedSpot =
        Boolean(scanTimeRaw) ||
        rawStatus === 'Pass' ||
        rawStatus === 'ผ่าน' ||
        rawStatus === 'ผ่านการสุ่มตรวจ' ||
        s.hasPhoto === true ||
        Boolean(s.photo);

      let photoUrl: string | null = null;
      if (isCompletedSpot) {
        photoUrl = getSelfiePhoto([
          s.photo,
          s.photoUrl,
          s.uuid,
          s.uuid ? `spot_${s.employeeId}_${s.date}_${s.uuid}` : undefined,
          `${s.employeeId}_${s.date}_${s.round}`,
        ]);
        if (!photoUrl && s.uuid && (s.hasPhoto === true || Boolean(s.photo))) {
          photoUrl = `/api/checkin/photo?uuid=${encodeURIComponent(s.uuid)}&type=spotcheck`;
        }
      }

      return {
        id: s.uuid || `${s.employeeId}_${s.date}_${s.round}`,
        employee_id: String(s.employeeId),
        check_date: s.date || todayStr,
        round: s.round || 'เช้า',
        scheduled_time: scheduledTime,
        actual_scan_time: actualScanTimeFormatted,
        gps_lat: null,
        gps_lng: null,
        photo_url: photoUrl,
        result_status: isCompletedSpot && (rawStatus === 'Scheduled' || rawStatus === 'Pending' || rawStatus === 'รอการยืนยัน') ? 'Pass' : rawStatus,
        created_at: `${s.date || todayStr}T${scheduledTime}+07:00`,
      };
    });

    // Deduplicate spot checks by date + round (prefer completed/passed over pending)
    const dedupedSpotMap = new Map<string, SpotCheck>();
    for (const item of rawFormattedSpots) {
      const key = `${item.check_date}_${item.round}`;
      const existing = dedupedSpotMap.get(key);
      if (!existing) {
        dedupedSpotMap.set(key, item);
      } else {
        const isCurrentCompleted =
          item.result_status === 'Pass' ||
          item.result_status === 'ผ่าน' ||
          item.result_status === 'ผ่านการสุ่มตรวจ' ||
          item.result_status === 'Fail' ||
          Boolean(item.actual_scan_time);
        const isExistingCompleted =
          existing.result_status === 'Pass' ||
          existing.result_status === 'ผ่าน' ||
          existing.result_status === 'ผ่านการสุ่มตรวจ' ||
          existing.result_status === 'Fail' ||
          Boolean(existing.actual_scan_time);
        if (isCurrentCompleted && !isExistingCompleted) {
          dedupedSpotMap.set(key, item);
        }
      }
    }
    const formattedSpots = Array.from(dedupedSpotMap.values());

    const currentEmp = employeesMap[session.employee_id] || {};
    const wfhStatus = currentEmp.wfhStatus || 'เปิดสิทธิ์';

    // Detect if employee has already checked in today via WFH app
    const todayMorningCheckin = selfCheckins.find(
      (c) => c.type === 'เข้างาน' || c.log_type === 'เข้างาน'
    );
    const isOfficeCheckin = Boolean(
      todayMorningCheckin &&
      (todayMorningCheckin.verificationStatus?.includes('ออฟฟิศ') ||
       todayMorningCheckin.verification_status?.includes('ออฟฟิศ') ||
       todayMorningCheckin.note?.includes('ปฏิบัติงานที่ออฟฟิศ'))
    );
    const hasCheckedInWfhToday = Boolean(todayMorningCheckin && !isOfficeCheckin);

    const { resolveEmployeeDailyStatus } = await import('@/lib/dailyStatus');
    const { getDailyLocationRecord, setDailyWorkLocation } = await import('@/lib/dailyLocationStore');

    let locRecord = getDailyLocationRecord(String(session.employee_id), todayStr);
    if (hasCheckedInWfhToday && !locRecord) {
      locRecord = setDailyWorkLocation(
        String(session.employee_id),
        'wfh',
        session.name,
        'ระบบลงเวลาเข้างาน WFH',
        todayStr,
        {
          reason: 'ปฏิบัติงานที่บ้าน (ลงเวลาเข้างานผ่านระบบ WFH)',
          is_auto_gps: false,
        }
      );
    }

    const dailyDetail = resolveEmployeeDailyStatus(String(session.employee_id), todayStr, {
      hasCheckedInWfhToday,
      isOfficeCheckin,
      wfhStatus,
    });

    const { getActiveManualSpotChecksAsync } = await import('@/lib/manualSpotCheckStore');
    const manualChecks = await getActiveManualSpotChecksAsync(String(session.employee_id));
    const activeManual = manualChecks.find(
      (s) => s.result_status === 'Scheduled' || s.result_status === 'Pending' || s.result_status === 'รอการยืนยัน'
    );

    // If employee is exempt from routine spot checks (Office, Holiday, Leave), omit routine checks
    const activeRoutine = dailyDetail.isExemptFromRoutineSpotCheck
      ? null
      : formattedSpots.find(
          (s) => s.result_status === 'Pending' || s.result_status === 'Scheduled' || s.result_status === 'รอการยืนยัน'
        );
    const activeSpotCheck = activeManual || activeRoutine || null;

    const filteredRoutineSpots = dailyDetail.isExemptFromRoutineSpotCheck
      ? formattedSpots.filter((s) => s.round?.includes('เฉพาะกิจ') || s.id?.startsWith('SPOT-MANUAL'))
      : formattedSpots;
    const finalSpots = [
      ...manualChecks.filter((m) => !filteredRoutineSpots.some((r) => r.id === m.id)),
      ...filteredRoutineSpots,
    ];

    return NextResponse.json(
      {
        success: true,
        employeeId: String(session.employee_id),
        role: session.role,
        wfhStatus: wfhStatus,
        workLocationToday: dailyDetail.location,
        resolvedDailyStatus: dailyDetail.status,
        dailyStatusReason: dailyDetail.reason || locRecord?.reason,
        isExemptFromMissingCheckin: dailyDetail.isExemptFromMissingCheckin,
        isExemptFromRoutineSpotCheck: dailyDetail.isExemptFromRoutineSpotCheck,
        checkinLogs: formattedCheckins,
        tasks: formattedTasks,
        spotChecks: finalSpots,
        activeSpotCheck,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=15',
        },
      }
    );
  } catch (error: any) {
    console.error('GET dashboard summary error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดแดชบอร์ด' }, { status: 500 });
  }
}

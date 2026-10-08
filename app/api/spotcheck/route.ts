import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS, invalidateGasCache } from '@/lib/gas';
import { SpotCheck } from '@/types';
import { saveSelfiePhoto, getSelfiePhoto } from '@/lib/photoStore';
import { getThaiDateStr, getThaiTime } from '@/lib/timeSync';

declare global {
  var __activeTestSpotChecks: SpotCheck[] | undefined;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const todayStr = getThaiDateStr();
    const { getLiveEmployeesMap } = await import('@/lib/gas');
    const { isEmployeePhotoExempt } = await import('@/lib/photoExempt');
    const { getActiveManualSpotChecksAsync } = await import('@/lib/manualSpotCheckStore');

    // Parallel fetch from GAS & cache to avoid waterfall delays
    const [gasRes, employeesMap] = await Promise.all([
      callGAS('getLogs', { logType: 'spotcheck', limit: 300 }),
      getLiveEmployeesMap().catch(() => ({})),
    ]);

    const rawSpotChecks = (gasRes?.data || []) as any[];

    // Filter by employee and optionally today
    const employeeChecks = rawSpotChecks.filter(
      (s) => String(s.employeeId) === String(session.employee_id)
    );

    const formatted: SpotCheck[] = employeeChecks.map((s) => {
      let lat: number | null = null;
      let lng: number | null = null;
      if (s.gps && typeof s.gps === 'string' && s.gps.includes('q=')) {
        const parts = s.gps.split('q=')[1]?.split(',');
        if (parts && parts.length === 2) {
          lat = parseFloat(parts[0]) || null;
          lng = parseFloat(parts[1]) || null;
        }
      } else if (s.gps && typeof s.gps === 'string' && s.gps.includes(',')) {
        const parts = s.gps.split(',');
        if (parts && parts.length === 2) {
          lat = parseFloat(parts[0]) || null;
          lng = parseFloat(parts[1]) || null;
        }
      }

      if (lat === null && (s.lat != null || s.gpsLat != null || s.gps_lat != null)) {
        lat = typeof s.lat === 'number' ? s.lat : (parseFloat(s.lat ?? s.gpsLat ?? s.gps_lat) || null);
      }
      if (lng === null && (s.lng != null || s.gpsLng != null || s.gps_lng != null)) {
        lng = typeof s.lng === 'number' ? s.lng : (parseFloat(s.lng ?? s.gpsLng ?? s.gps_lng) || null);
      }

      const scheduledTime = s.triggeredTime || s.scheduledTime || s.time || (s.round === 'เช้า' ? '09:30:00' : '14:30:00');
      const status = s.status || s.resultStatus || 'Scheduled';
      const scanTimeRaw = s.checkInTime || s.actualScanTime || null;
      let actualScanTimeFormatted: string | null = null;
      if (scanTimeRaw) {
        if (typeof scanTimeRaw === 'string' && scanTimeRaw.includes('T')) {
          actualScanTimeFormatted = scanTimeRaw;
        } else {
          actualScanTimeFormatted = `${s.date || todayStr}T${String(scanTimeRaw).padStart(8, '0')}+07:00`;
        }
      }

      let photoUrl = getSelfiePhoto([
        s.photo,
        s.photoUrl,
        s.uuid,
        `${s.employeeId}_${s.date}`,
        `${s.employeeId}_${s.date}_${s.round}`,
        String(s.employeeId),
      ]);

      if (!photoUrl && (s.hasPhoto === true || Boolean(s.photo))) {
        photoUrl = `/api/checkin/photo?uuid=${encodeURIComponent(s.uuid)}&type=spotcheck`;
      }

      return {
        id: s.uuid || `${s.employeeId}_${s.date}_${s.round}`,
        employee_id: String(s.employeeId),
        check_date: s.date || todayStr,
        round: s.round || 'เช้า',
        scheduled_time: scheduledTime,
        actual_scan_time: actualScanTimeFormatted,
        gps_lat: lat,
        gps_lng: lng,
        photo_url: photoUrl,
        result_status: status,
        created_at: `${s.date || todayStr}T${scheduledTime}+07:00`,
      };
    });

    // Deduplicate spot checks by date + round (keep completed or latest)
    const dedupedMap = new Map<string, SpotCheck>();
    for (const item of formatted) {
      const key = `${item.check_date}_${item.round}`;
      const existing = dedupedMap.get(key);
      if (!existing) {
        dedupedMap.set(key, item);
      } else {
        const isCurrentCompleted = item.result_status === 'Pass' || item.result_status === 'Fail' || Boolean(item.actual_scan_time);
        const isExistingCompleted = existing.result_status === 'Pass' || existing.result_status === 'Fail' || Boolean(existing.actual_scan_time);
        if (isCurrentCompleted && !isExistingCompleted) {
          dedupedMap.set(key, item);
        }
      }
    }
    const dedupedFormatted = Array.from(dedupedMap.values());

    // Check resolved daily status (Leave, Holiday, Office vs WFH)
    const { resolveEmployeeDailyStatus } = await import('@/lib/dailyStatus');
    const dailyStatus = resolveEmployeeDailyStatus(String(session.employee_id), todayStr);
    const isExemptFromRoutine = dailyStatus.isExemptFromRoutineSpotCheck;
    const isWorkingAtOfficeToday = dailyStatus.status === 'office';

    // Fetch manual spot checks from persistent store (with Google Sheets recovery)
    const manualChecks = await getActiveManualSpotChecksAsync(String(session.employee_id));

    const testChecks = [
      ...manualChecks,
      ...((global.__activeTestSpotChecks || []).filter(
        (t) => String(t.employee_id) === String(session.employee_id) && !manualChecks.some((m) => m.id === t.id)
      )),
    ];

    let finalSpotChecks = dedupedFormatted;
    let finalTestChecks = testChecks;
    if (isExemptFromRoutine) {
      // If working at office or on leave, exempt from routine scheduled checks (เช้า / บ่าย) and test checks,
      // but STILL include supervisor ad-hoc manual spot checks!
      finalSpotChecks = dedupedFormatted.filter(
        (s) => s.round?.includes('เฉพาะกิจ') || s.id?.startsWith('SPOT-MANUAL')
      );
      finalTestChecks = testChecks.filter(
        (t) => t.round?.includes('เฉพาะกิจ') || t.id?.startsWith('SPOT-MANUAL')
      );
    }

    const combined = [...finalTestChecks, ...finalSpotChecks];
    const currentEmp = (employeesMap as Record<string, any>)[session.employee_id] || {};
    const position = currentEmp.position || '';
    const isPhotoExempt = await isEmployeePhotoExempt({
      employee_id: session.employee_id,
      position: position,
      role: session.role,
    });

    return NextResponse.json(
      {
        spotChecks: combined,
        is_photo_exempt: isPhotoExempt,
        is_working_at_office_today: isWorkingAtOfficeToday,
        is_on_leave_today: dailyStatus.status === 'leave' || dailyStatus.status === 'leave_pending',
        daily_status: dailyStatus.status,
        employee_position: position,
        server_time: new Date().toISOString(),
        server_timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=15',
        },
      }
    );
  } catch (error: any) {
    console.error('GET spot check error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสุ่มตรวจจาก Google Sheet' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const todayStr = getThaiDateStr();
    const timeStr = getThaiTime().timeStr;

    const testSpotCheck: SpotCheck = {
      id: `TEST-${Date.now()}`,
      employee_id: '1111',
      check_date: todayStr,
      round: 'ทดสอบสด',
      scheduled_time: timeStr,
      actual_scan_time: null,
      gps_lat: null,
      gps_lng: null,
      photo_url: null,
      result_status: 'Scheduled',
      created_at: new Date().toISOString(),
    };

    if (!global.__activeTestSpotChecks) {
      global.__activeTestSpotChecks = [];
    }
    // Remove previous pending test checks and add this one
    global.__activeTestSpotChecks = [
      testSpotCheck,
      ...global.__activeTestSpotChecks.filter((t) => t.employee_id !== '1111'),
    ];

    return NextResponse.json({
      success: true,
      message: 'สร้างรอบสุ่มตรวจจำลองสำหรับรหัส 1111 สำเร็จแล้ว',
      spotCheck: testSpotCheck,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const body = await request.json();
    const { spot_check_id, gps_lat, gps_lng, photo_base64, out_of_bounds_reason, note, distance_km } = body;
    const reasonText = (out_of_bounds_reason || note || '').trim();

    if (!spot_check_id) {
      return NextResponse.json({ error: 'ไม่ระบุรหัสการสุ่มตรวจ' }, { status: 400 });
    }

    const todayStr = getThaiDateStr();

    if (photo_base64 && typeof photo_base64 === 'string') {
      saveSelfiePhoto(spot_check_id, photo_base64, [
        `spot_${session.employee_id}_${todayStr}_${spot_check_id}`,
      ]);
    }

    if (String(spot_check_id).startsWith('TEST-') || String(spot_check_id).startsWith('SPOT-MANUAL-')) {
      const nowIso = new Date().toISOString();
      const { updateManualSpotCheck } = await import('@/lib/manualSpotCheckStore');
      updateManualSpotCheck(spot_check_id, {
        result_status: 'Pass',
        actual_scan_time: nowIso,
        gps_lat: gps_lat || null,
        gps_lng: gps_lng || null,
        photo_url: photo_base64 || null,
      });

      if (global.__activeTestSpotChecks) {
        global.__activeTestSpotChecks = global.__activeTestSpotChecks.map((t) => {
          if (t.id === spot_check_id) {
            return {
              ...t,
              result_status: 'Pass',
              actual_scan_time: nowIso,
              gps_lat: gps_lat || null,
              gps_lng: gps_lng || null,
              photo_url: photo_base64 || t.photo_url || null,
            };
          }
          return t;
        });
      }

      // Log to Google Apps Script
      try {
        const spotNote = reasonText
          ? `[สุ่มตรวจเฉพาะกิจ] ย้ายสถานที่ (${reasonText}) (${spot_check_id})`
          : `[สุ่มตรวจเฉพาะกิจ] ยืนยันตัวตนสำเร็จ (${spot_check_id})`;

        await callGAS('checkin', {
          type: 'ยืนยันตัวตน',
          employeeId: session.employee_id,
          lat: gps_lat || null,
          lng: gps_lng || null,
          photo: photo_base64 || null,
          note: spotNote,
          reason: reasonText,
          outOfBoundsReason: reasonText,
        });
      } catch (logErr) {
        console.warn('Manual spot check gas log error:', logErr);
      }

      // Notify supervisor
      try {
        const { getLiveEmployeesMap } = await import('@/lib/gas');
        const { createNotification } = await import('@/lib/notifications');
        const empsMap = await getLiveEmployeesMap();
        const supervisorId = empsMap[session.employee_id]?.supervisorId || '8888';
        const empName = session.name || empsMap[session.employee_id]?.name || session.employee_id;

        const supervisorMsg = reasonText
          ? `คุณ ${empName} (${session.employee_id}) ยืนยันพิกัดและเซลฟี่แล้ว [ห่างจุดเช็คอิน ${distance_km || '>20'} กม. เหตุผล: ${reasonText}]`
          : `คุณ ${empName} (${session.employee_id}) ได้เปิดกล้องถ่ายภาพ Selfie และยืนยันพิกัดเรียบร้อยแล้ว`;

        await createNotification({
          employee_id: supervisorId,
          type: 'spotcheck',
          title: `✅ ลูกทีมยืนยันตัวตนสุ่มตรวจสำเร็จแล้ว`,
          message: supervisorMsg,
          link: '/supervisor',
        });
      } catch (notifErr) {
        console.warn('Failed to notify supervisor:', notifErr);
      }

      invalidateGasCache();

      return NextResponse.json({
        success: true,
        result_status: 'Pass',
        message: 'คุณได้ยืนยันตัวตนสุ่มตรวจเฉพาะกิจเรียบร้อยแล้ว!',
      });
    }

    // 1. Try submitSpotCheck directly
    const mapsGpsUrl = gps_lat && gps_lng ? `https://www.google.com/maps?q=${gps_lat},${gps_lng}` : '';
    const spotNote = reasonText
      ? `[สุ่มตรวจ] เคลื่อนย้ายสถานที่ (${reasonText})`
      : '';

    let gasResult = await callGAS('submitSpotCheck', {
      employeeId: session.employee_id,
      spotUuid: spot_check_id,
      spotCheckId: spot_check_id,
      spotCheckUuid: spot_check_id,
      uuid: spot_check_id,
      lat: gps_lat || null,
      lng: gps_lng || null,
      gps: mapsGpsUrl,
      gps_lat: gps_lat || null,
      gps_lng: gps_lng || null,
      photo: photo_base64 || null,
      note: spotNote,
      reason: reasonText,
      outOfBoundsReason: reasonText,
    });

    // 2. If GAS submitSpotCheck returns false, fallback to checkin 'ยืนยันตัวตน'
    if (!gasResult?.success) {
      try {
        const checkinFallback = await callGAS('checkin', {
          type: 'ยืนยันตัวตน',
          employeeId: session.employee_id,
          lat: gps_lat || null,
          lng: gps_lng || null,
          photo: photo_base64 || null,
          note: spotNote || `[สุ่มตรวจ] ยืนยันตัวตนตามเวลาสุ่มตรวจ (${spot_check_id})`,
          reason: reasonText,
          outOfBoundsReason: reasonText,
        });

        if (checkinFallback?.success || checkinFallback?.message?.includes('เรียบร้อยแล้ว')) {
          gasResult = { success: true, message: 'ยืนยันตัวตนสุ่มตรวจสำเร็จแล้ว' };
        }
      } catch (fallbackErr) {
        console.warn('Fallback checkin error:', fallbackErr);
      }
    }

    if (gasResult && !gasResult.success) {
      // If message indicates already completed
      if (gasResult.message?.includes('เรียบร้อยแล้ว')) {
        invalidateGasCache();
        return NextResponse.json({
          success: true,
          result_status: 'Pass',
          message: 'คุณได้ยืนยันตัวตนเรียบร้อยแล้ว',
        });
      }

      return NextResponse.json(
        { error: gasResult.message || 'บันทึกการสุ่มตรวจใน Google Sheet ไม่สำเร็จ' },
        { status: 400 }
      );
    }

    invalidateGasCache();

    // Notify supervisor for regular spot check
    try {
      const { getLiveEmployeesMap } = await import('@/lib/gas');
      const { createNotification } = await import('@/lib/notifications');
      const empsMap = await getLiveEmployeesMap();
      const supervisorId = empsMap[session.employee_id]?.supervisorId || '8888';
      const empName = session.name || empsMap[session.employee_id]?.name || session.employee_id;

      const supervisorMsg = reasonText
        ? `คุณ ${empName} (${session.employee_id}) ยืนยันพิกัดและถ่ายภาพแล้ว [ห่างจุดเช็คอิน ${distance_km || '>20'} กม. เหตุผล: ${reasonText}]`
        : `คุณ ${empName} (${session.employee_id}) ได้เปิดกล้องถ่ายภาพ Selfie และยืนยันพิกัดเรียบร้อยแล้ว`;

      await createNotification({
        employee_id: supervisorId,
        type: 'spotcheck',
        title: `✅ ลูกทีมยืนยันตัวตนสุ่มตรวจสำเร็จแล้ว`,
        message: supervisorMsg,
        link: '/supervisor',
      });
    } catch (notifErr) {
      console.warn('Failed to notify supervisor on regular spot check:', notifErr);
    }

    return NextResponse.json({
      success: true,
      result_status: gasResult?.resultStatus || 'Pass',
      message: gasResult?.message || 'ยืนยันตัวตนสุ่มตรวจสำเร็จใน Google Sheet',
    });
  } catch (error: any) {
    console.error('POST spot check error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการสุ่มตรวจ' }, { status: 500 });
  }
}

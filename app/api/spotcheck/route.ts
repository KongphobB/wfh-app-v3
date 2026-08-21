import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS, invalidateGasCache } from '@/lib/gas';
import { SpotCheck } from '@/types';
import { saveSelfiePhoto, getSelfiePhoto } from '@/lib/photoStore';

declare global {
  var __activeTestSpotChecks: SpotCheck[] | undefined;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const gasRes = await callGAS('getLogs', { logType: 'spotcheck', limit: 300 });
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

      const photoUrl = getSelfiePhoto([
        s.photo,
        s.photoUrl,
        s.uuid,
        `${s.employeeId}_${s.date}`,
        `${s.employeeId}_${s.date}_${s.round}`,
        String(s.employeeId),
      ]);

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

    // Check if employee is working at office today
    let isWorkingAtOfficeToday = false;
    try {
      const checkinRes = await callGAS('getLogs', { logType: 'checkin', limit: 100 });
      const checkinLogs = (checkinRes?.data || []) as any[];
      const todayMorningCheckin = checkinLogs.find(
        (c) =>
          String(c.employeeId) === String(session.employee_id) &&
          c.date === todayStr &&
          c.type === 'เข้างาน'
      );
      if (todayMorningCheckin && todayMorningCheckin.verificationStatus === 'ปฏิบัติงานที่ออฟฟิศ') {
        isWorkingAtOfficeToday = true;
      }
    } catch {
      // Ignore checkin check error
    }

    const testChecks = (global.__activeTestSpotChecks || []).filter(
      (t) => String(t.employee_id) === String(session.employee_id)
    );

    if (isWorkingAtOfficeToday) {
      return NextResponse.json({
        spotChecks: testChecks,
        server_time: new Date().toISOString(),
        server_timestamp: Date.now(),
      });
    }

    const combined = [...testChecks, ...formatted];
    const { getLiveEmployeesMap } = await import('@/lib/gas');
    const { isEmployeePhotoExempt } = await import('@/lib/photoExempt');
    const employeesMap = await getLiveEmployeesMap();
    const currentEmp = employeesMap[session.employee_id] || {};
    const position = currentEmp.position || '';
    const isPhotoExempt = await isEmployeePhotoExempt({
      employee_id: session.employee_id,
      position: position,
      role: session.role,
    });

    return NextResponse.json({
      spotChecks: combined,
      is_photo_exempt: isPhotoExempt,
      employee_position: position,
      server_time: new Date().toISOString(),
      server_timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('GET spot check error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสุ่มตรวจจาก Google Sheet' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

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
    const { spot_check_id, gps_lat, gps_lng, photo_base64 } = body;

    if (!spot_check_id) {
      return NextResponse.json({ error: 'ไม่ระบุรหัสการสุ่มตรวจ' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (photo_base64 && typeof photo_base64 === 'string') {
      saveSelfiePhoto(spot_check_id, photo_base64, [
        session.employee_id,
        `${session.employee_id}_${todayStr}`,
        `${session.employee_id}_${todayStr}_${spot_check_id}`,
        `spot_${session.employee_id}_${todayStr}`,
      ]);
    }

    if (String(spot_check_id).startsWith('TEST-') || String(spot_check_id).startsWith('SPOT-MANUAL-')) {
      const nowIso = new Date().toISOString();
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
        await callGAS('checkin', {
          type: 'ยืนยันตัวตน',
          employeeId: session.employee_id,
          lat: gps_lat || null,
          lng: gps_lng || null,
          photo: photo_base64 || null,
          note: `[สุ่มตรวจเฉพาะกิจ] ยืนยันตัวตนสำเร็จ (${spot_check_id})`,
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

        await createNotification({
          employee_id: supervisorId,
          type: 'spotcheck',
          title: `✅ ลูกทีมยืนยันตัวตนสุ่มตรวจสำเร็จแล้ว`,
          message: `คุณ ${empName} (${session.employee_id}) ได้เปิดกล้องถ่ายภาพ Selfie และยืนยันพิกัดเรียบร้อยแล้ว`,
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
    let gasResult = await callGAS('submitSpotCheck', {
      employeeId: session.employee_id,
      spotUuid: spot_check_id,
      spotCheckId: spot_check_id,
      spotCheckUuid: spot_check_id,
      uuid: spot_check_id,
      lat: gps_lat || null,
      lng: gps_lng || null,
      photo: photo_base64 || null,
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
          note: `[สุ่มตรวจ] ยืนยันตัวตนตามเวลาสุ่มตรวจ (${spot_check_id})`,
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

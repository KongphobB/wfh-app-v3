import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS, getLiveEmployeesMap } from '@/lib/gas';
import { CheckinLog } from '@/types';
import { isEmployeePhotoExempt } from '@/lib/photoExempt';
import { saveSelfiePhoto, getSelfiePhoto } from '@/lib/photoStore';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope'); // 'all' | 'team' | 'self'
    const todayStr = new Date().toISOString().split('T')[0];

    const [gasRes, gasSpotRes] = await Promise.all([
      callGAS('getLogs', { logType: 'checkin', limit: 300 }),
      callGAS('getLogs', { logType: 'spotcheck', limit: 300 }),
    ]);

    const rawCheckinLogs = (gasRes?.data || []) as any[];
    const rawSpotLogs = ((gasSpotRes?.data || []) as any[]).map((s: any) => ({
      ...s,
      uuid: s.uuid || `spot_${s.employeeId}_${s.date}_${s.time || s.scheduledTime}`,
      type: s.type || 'สุ่มตรวจ',
      time: s.time || s.checkInTime || s.actualScanTime || s.scheduledTime || s.triggeredTime || '10:00:00',
      verificationStatus: s.status || s.resultStatus || 'ยืนยันสำเร็จ',
      note: s.note || (s.round ? `[สุ่มตรวจรอบ ${s.round}]` : '[สุ่มตรวจ]'),
    }));

    const testSpotLogs = (((global as any).__activeTestSpotChecks || []) as any[]).map((s: any) => ({
      uuid: s.id,
      employeeId: s.employee_id,
      type: 'สุ่มตรวจเฉพาะกิจ',
      date: s.check_date,
      time: s.actual_scan_time ? s.actual_scan_time.split('T')[1]?.split('+')[0] : s.scheduled_time,
      gps: s.gps_lat && s.gps_lng ? `q=${s.gps_lat},${s.gps_lng}` : null,
      photo: s.photo_url || null,
      verificationStatus: s.result_status === 'Pass' ? 'ยืนยันสำเร็จ' : s.result_status || 'รอสุ่มตรวจ',
      note: '[สุ่มตรวจเฉพาะกิจ]',
    }));

    const rawLogs = [...rawCheckinLogs, ...rawSpotLogs, ...testSpotLogs];

    // Fetch employee map for supervisor/team hierarchy
    const employeesMap = await getLiveEmployeesMap();

    // Filter to strictly attendance & verification logs (เข้างาน, ออกงาน, สุ่มตรวจ, ยืนยันตัวตน)
    const isAttendanceLog = (type?: string) => {
      if (!type) return false;
      const invalidKeywords = ['แก้ไขประวัติ', 'เปลี่ยน PIN', 'สมัครสมาชิก', 'รีเซ็ต PIN', 'แก้ไขข้อมูล'];
      if (invalidKeywords.some((k) => type.includes(k))) return false;
      const validTypes = ['เข้างาน', 'ออกงาน', 'สุ่มตรวจ', 'ยืนยันตัวตน'];
      return validTypes.some((t) => type.includes(t));
    };

    let filtered = rawLogs.filter((l) => isAttendanceLog(l.type));

    if (scope === 'all' && session.role === 'admin') {
      // Admin global logs (all attendance records)
    } else if (scope === 'team' && (session.role === 'supervisor' || session.role === 'admin')) {
      const subordinateIds = Object.keys(employeesMap).filter(
        (empId) => String(employeesMap[empId]?.supervisorId) === String(session.employee_id)
      );
      filtered = filtered.filter((l) => subordinateIds.includes(String(l.employeeId)));
    } else if (scope === 'self') {
      filtered = filtered.filter((l) => String(l.employeeId) === String(session.employee_id));
    } else {
      // Default: Personal attendance logs for today
      filtered = filtered.filter(
        (l) => String(l.employeeId) === String(session.employee_id) && l.date === todayStr
      );
    }

    const formattedLogs: CheckinLog[] = filtered.map((l) => {
      let lat: number | null = null;
      let lng: number | null = null;
      if (l.gps && typeof l.gps === 'string' && l.gps.includes('q=')) {
        const parts = l.gps.split('q=')[1]?.split(',');
        if (parts && parts.length === 2) {
          lat = parseFloat(parts[0]) || null;
          lng = parseFloat(parts[1]) || null;
        }
      }

      const timeFormatted = l.time ? (l.time.length === 5 ? `${l.time}:00` : l.time) : '08:00:00';
      const isoTimeStr = `${l.date}T${timeFormatted}+07:00`;

      // Check memory or disk for photo
      const photoUrl = getSelfiePhoto([
        l.photo,
        l.photoUrl,
        l.uuid,
        `${l.employeeId}_${l.date}`,
        `${l.employeeId}_${l.date}_${l.time}`,
        `spot_${l.employeeId}_${l.date}`,
        (l.date === todayStr ? String(l.employeeId) : null),
      ]);

      const hasPhoto = l.hasPhoto === true || Boolean(photoUrl);

      return {
        id: l.uuid || `${l.employeeId}_${l.date}_${l.time}`,
        employee_id: String(l.employeeId),
        employee_name: l.name || employeesMap[l.employeeId]?.name || l.employeeId,
        log_type: l.type || 'เข้างาน',
        log_date: l.date,
        log_time: isoTimeStr,
        gps_lat: lat,
        gps_lng: lng,
        photo_url: photoUrl,
        has_photo: hasPhoto,
        note: l.note || null,
        out_of_bounds_reason: null,
        is_early_leave: false,
        verification_status: l.verificationStatus || 'ปกติ',
        created_at: isoTimeStr,
        updated_at: isoTimeStr,
        department: l.dept || employeesMap[l.employeeId]?.dept,
        position: l.position || employeesMap[l.employeeId]?.position,
      };
    });

    const currentEmp = employeesMap[session.employee_id] || {};
    const position = currentEmp.position || '';
    const isPhotoExempt = await isEmployeePhotoExempt({
      employee_id: session.employee_id,
      position: position,
      role: session.role,
    });

    return NextResponse.json({
      logs: formattedLogs,
      is_photo_exempt: isPhotoExempt,
      employee_position: position,
    });
  } catch (error: any) {
    console.error('GET checkin error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลเช็คอินจาก Google Sheet' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const body = await request.json();
    const { log_type, gps_lat, gps_lng, photo_base64, note, out_of_bounds_reason } = body;

    if (!log_type || !['เข้างาน', 'ออกงาน', 'ยืนยันตัวตน'].includes(log_type)) {
      return NextResponse.json({ error: 'ประเภทการลงเวลาไม่ถูกต้อง' }, { status: 400 });
    }

    // Check photo exemption for current employee
    const employeesMap = await getLiveEmployeesMap();
    const currentEmp = employeesMap[session.employee_id] || {};
    const position = currentEmp.position || '';
    const isPhotoExempt = await isEmployeePhotoExempt({
      employee_id: session.employee_id,
      position: position,
      role: session.role,
    });

    if (!photo_base64 && !isPhotoExempt) {
      return NextResponse.json(
        { error: 'จำเป็นต้องถ่ายภาพ Selfie สดเพื่อยืนยันตัวตน' },
        { status: 400 }
      );
    }

    const thaiTimeStr = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Bangkok', hour12: false });
    const [thHourStr, thMinStr] = thaiTimeStr.split(':');
    const currentHour = parseInt(thHourStr, 10);
    const currentMinute = parseInt(thMinStr, 10);

    if (log_type === 'เข้างาน' && (currentHour > 8 || (currentHour === 8 && currentMinute > 0)) && (!note || !note.trim())) {
      return NextResponse.json(
        { error: 'เนื่องจากคุณลงเวลาเข้างานหลังเวลา 08:00 น. (สาย) กรุณาระบุเหตุผลความจำเป็นในช่องหมายเหตุ' },
        { status: 400 }
      );
    }

    if (log_type === 'ยืนยันตัวตน' && currentHour < 13) {
      return NextResponse.json(
        { error: 'ยังไม่ถึงเวลายืนยันตัวตน (รอบยืนยันตัวตนช่วงบ่ายเปิดเวลา 13:00 - 13:20 น.)' },
        { status: 400 }
      );
    }

    if (log_type === 'ออกงาน' && currentHour < 17 && (!note || !note.trim())) {
      return NextResponse.json(
        { error: 'เนื่องจากคุณลงเวลาออกงานก่อนเวลา 17:00 น. กรุณาระบุเหตุผลการออกก่อนเวลาในช่องหมายเหตุ' },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Store in memory cache & disk for persistent preview
    if (photo_base64 && typeof photo_base64 === 'string') {
      saveSelfiePhoto(`${session.employee_id}_${todayStr}`, photo_base64, [
        String(session.employee_id),
      ]);
    }

    const effectiveReason = out_of_bounds_reason || note || body.reason || '';
    const effectiveNote = note || out_of_bounds_reason || '';

    // Call Google Apps Script backend directly
    const gasResult = await callGAS('checkin', {
      type: log_type,
      employeeId: session.employee_id,
      lat: gps_lat || null,
      lng: gps_lng || null,
      photo: photo_base64 || null,
      note: effectiveNote,
      reason: effectiveReason,
      outOfBoundsReason: effectiveReason,
      locationReason: effectiveReason,
      movementReason: effectiveReason,
    });

    if (gasResult && !gasResult.success) {
      return NextResponse.json(
        { error: gasResult.message || 'บันทึกข้อมูลใน Google Sheet ไม่สำเร็จ' },
        { status: 400 }
      );
    }

    if (gasResult?.data?.uuid && photo_base64) {
      saveSelfiePhoto(gasResult.data.uuid, photo_base64, [
        `${session.employee_id}_${todayStr}`,
        String(session.employee_id),
      ]);
    }

    return NextResponse.json({
      success: true,
      message: gasResult?.message || `ลงเวลา ${log_type} สำเร็จใน Google Sheet`,
    });
  } catch (error: any) {
    console.error('POST checkin error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการลงเวลา' }, { status: 500 });
  }
}

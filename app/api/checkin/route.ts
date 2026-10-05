import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS, getLiveEmployeesMap } from '@/lib/gas';
import { CheckinLog } from '@/types';
import { isEmployeePhotoExempt } from '@/lib/photoExempt';
import { saveSelfiePhoto, getSelfiePhoto } from '@/lib/photoStore';
import { getThaiDateStr, getThaiTime } from '@/lib/timeSync';
import { sendLateCheckinNotificationEmail } from '@/lib/email';
import { createNotificationForSupervisor } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope'); // 'all' | 'team' | 'self'
    const todayStr = getThaiDateStr();

    const [gasRes, gasSpotRes] = await Promise.all([
      callGAS('getLogs', { logType: 'checkin', limit: 300 }),
      callGAS('getLogs', { logType: 'spotcheck', limit: 300 }),
    ]);

    const rawCheckinLogs = (gasRes?.data || []) as any[];

    // Build map of employee check-in GPS by employeeId_date for fallback
    const checkinGpsMap = new Map<string, string>();
    for (const c of rawCheckinLogs) {
      if (c.employeeId && c.date && c.gps && typeof c.gps === 'string' && c.gps.includes('q=')) {
        const key = `${c.employeeId}_${c.date}`;
        if (!checkinGpsMap.has(key)) {
          checkinGpsMap.set(key, c.gps);
        }
      }
    }

    // Only include COMPLETED spot checks in attendance history (never leak scheduled future checks)
    const rawSpotLogs = ((gasSpotRes?.data || []) as any[])
      .filter((s: any) => {
        const status = s.status || s.resultStatus || s.verificationStatus || '';
        const isPending = status === 'Scheduled' || status === 'Pending' || status === 'รอการยืนยัน' || status === 'รอสุ่มตรวจ';
        const hasScanned = Boolean(s.actualScanTime) || Boolean(s.checkInTime) || status === 'Pass' || status === 'Fail' || status === 'ผ่าน' || status === 'ไม่ผ่าน' || status === 'ผ่านการสุ่มตรวจ' || status === 'ไม่ผ่าน (ขาดการติดต่อ)';
        return !isPending && hasScanned;
      })
      .map((s: any) => {
        const actualTime = s.actualScanTime || s.checkInTime || s.time || (s.date ? '09:00:00' : '09:00:00');
        const cleanTime = typeof actualTime === 'string' && actualTime.includes('T')
          ? actualTime.split('T')[1]?.split('+')[0]?.substring(0, 8)
          : actualTime;

        // Parse coordinates
        let spotLat: number | null = null;
        let spotLng: number | null = null;
        let spotGps = s.gps || null;

        if (typeof spotGps === 'string' && spotGps.includes('q=')) {
          const parts = spotGps.split('q=')[1]?.split(',');
          if (parts && parts.length === 2) {
            spotLat = parseFloat(parts[0]) || null;
            spotLng = parseFloat(parts[1]) || null;
          }
        } else if (typeof spotGps === 'string' && spotGps.includes(',')) {
          const parts = spotGps.split(',');
          if (parts && parts.length === 2) {
            spotLat = parseFloat(parts[0]) || null;
            spotLng = parseFloat(parts[1]) || null;
          }
        }

        if (spotLat === null && (s.lat != null || s.gpsLat != null || s.gps_lat != null)) {
          spotLat = typeof s.lat === 'number' ? s.lat : (parseFloat(s.lat ?? s.gpsLat ?? s.gps_lat) || null);
        }
        if (spotLng === null && (s.lng != null || s.gpsLng != null || s.gps_lng != null)) {
          spotLng = typeof s.lng === 'number' ? s.lng : (parseFloat(s.lng ?? s.gpsLng ?? s.gps_lng) || null);
        }

        // If GPS is empty, try building from spotLat/spotLng or fallback to checkin GPS for that employee & date
        if (!spotGps || spotGps === '') {
          if (spotLat && spotLng) {
            spotGps = `https://www.google.com/maps?q=${spotLat},${spotLng}`;
          } else {
            const fallbackGps = checkinGpsMap.get(`${s.employeeId}_${s.date}`);
            if (fallbackGps) {
              spotGps = fallbackGps;
              const parts = fallbackGps.split('q=')[1]?.split(',');
              if (parts && parts.length === 2) {
                spotLat = parseFloat(parts[0]) || null;
                spotLng = parseFloat(parts[1]) || null;
              }
            }
          }
        }

        return {
          ...s,
          uuid: s.uuid || `spot_${s.employeeId}_${s.date}_${s.round || cleanTime}`,
          type: 'สุ่มตรวจ',
          time: cleanTime,
          gps: spotGps,
          lat: spotLat,
          lng: spotLng,
          gps_lat: spotLat,
          gps_lng: spotLng,
          verificationStatus: s.status === 'Pass' || s.resultStatus === 'Pass' ? 'ยืนยันสำเร็จ' : (s.status || s.resultStatus || 'ยืนยันสำเร็จ'),
          note: s.note || (s.round ? `[สุ่มตรวจรอบ ${s.round}]` : '[สุ่มตรวจ]'),
        };
      });

    const testSpotLogs = (((global as any).__activeTestSpotChecks || []) as any[])
      .filter((s: any) => s.result_status === 'Pass' && s.actual_scan_time)
      .map((s: any) => ({
        uuid: s.id,
        employeeId: s.employee_id,
        type: 'สุ่มตรวจเฉพาะกิจ',
        date: s.check_date,
        time: s.actual_scan_time ? s.actual_scan_time.split('T')[1]?.split('+')[0]?.substring(0, 8) : '09:00:00',
        gps: s.gps_lat && s.gps_lng ? `https://www.google.com/maps?q=${s.gps_lat},${s.gps_lng}` : null,
        lat: s.gps_lat || null,
        lng: s.gps_lng || null,
        gps_lat: s.gps_lat || null,
        gps_lng: s.gps_lng || null,
        photo: s.photo_url || null,
        verificationStatus: 'ยืนยันสำเร็จ',
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
      } else if (l.gps && typeof l.gps === 'string' && l.gps.includes(',')) {
        const parts = l.gps.split(',');
        if (parts && parts.length === 2) {
          lat = parseFloat(parts[0]) || null;
          lng = parseFloat(parts[1]) || null;
        }
      }

      if (lat === null && (l.lat != null || l.gps_lat != null || l.gpsLat != null)) {
        lat = typeof l.gps_lat === 'number' ? l.gps_lat : (parseFloat(l.lat ?? l.gps_lat ?? l.gpsLat) || null);
      }
      if (lng === null && (l.lng != null || l.gps_lng != null || l.gpsLng != null)) {
        lng = typeof l.gps_lng === 'number' ? l.gps_lng : (parseFloat(l.lng ?? l.gps_lng ?? l.gpsLng) || null);
      }

      const timeFormatted = l.time ? (l.time.length === 5 ? `${l.time}:00` : l.time) : '08:00:00';
      const isoTimeStr = `${l.date}T${timeFormatted}+07:00`;

      // Check memory or disk for photo
      let photoUrl = getSelfiePhoto([
        l.photo,
        l.photoUrl,
        l.uuid,
        `${l.employeeId}_${l.date}`,
        `${l.employeeId}_${l.date}_${l.time}`,
        `spot_${l.employeeId}_${l.date}`,
        String(l.employeeId),
      ]);

      // If photo was saved in Google Drive (hasPhoto is true or photo exists)
      if (!photoUrl && (l.hasPhoto === true || Boolean(l.photo))) {
        const gasType = l.type?.includes('สุ่มตรวจ') ? 'spotcheck' : 'checkin';
        photoUrl = `/api/checkin/photo?uuid=${encodeURIComponent(l.uuid)}&type=${gasType}`;
      }

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

    formattedLogs.sort((a, b) => new Date(b.log_time).getTime() - new Date(a.log_time).getTime());

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

    const { hour: currentHour, minute: currentMinute } = getThaiTime();

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

    const todayStr = getThaiDateStr();

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

    // If check-in is late (หลัง 08:00 น.), send email notification to BOTH supervisor and admin
    const isLate = currentHour > 8 || (currentHour === 8 && currentMinute > 0);
    if (log_type === 'เข้างาน' && isLate) {
      try {
        const supervisorId = currentEmp.supervisorId;
        const supervisorEmail = supervisorId ? employeesMap[supervisorId]?.email : null;
        const adminEmail = employeesMap['9999']?.email || process.env.ADMIN_EMAIL || null;
        const checkinTimeFormatted = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

        await sendLateCheckinNotificationEmail({
          employeeName: session.name || currentEmp.name || session.employee_id,
          employeeId: session.employee_id,
          department: session.department || currentEmp.dept,
          position: currentEmp.position,
          checkinTime: checkinTimeFormatted,
          reason: effectiveReason,
          supervisorEmail,
          adminEmail,
          employeeEmail: currentEmp.email,
        });

        // In-app notification to supervisor
        if (supervisorId) {
          await createNotificationForSupervisor({
            supervisor_id: supervisorId,
            type: 'warning',
            title: `⏰ พนักงานเข้างานสาย: ${session.name} (${session.employee_id})`,
            message: `ลงเวลาเข้างานเวลา ${checkinTimeFormatted} น. เหตุผล: "${effectiveReason || 'ไม่ได้ระบุเหตุผล'}"`,
            link: '/supervisor',
          });
        }
      } catch (emailErr) {
        console.warn('Failed to send late checkin email alert:', emailErr);
      }
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

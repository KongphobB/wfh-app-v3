import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  determineVerificationStatus,
  isPhotoOptionalForPosition,
  calculateHaversineDistanceKm,
  MAX_MOVEMENT_DISTANCE_KM,
} from '@/lib/geo';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';
import { CheckinLog, VerificationStatus } from '@/types';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope'); // 'all' | 'team' | 'self'
    const todayStr = new Date().toISOString().split('T')[0];

    // Determine query scope
    const isOwner = !scope || scope === 'self';
    const isAdminView = session.role === 'admin' && scope === 'all';
    const isSupervisorView = (session.role === 'supervisor' || session.role === 'admin') && scope === 'team';

    if (isSupervisorView) {
      // Fetch only subordinates of this supervisor
      const { data: subEmps } = await supabaseAdmin
        .from('employees')
        .select('employee_id')
        .eq('supervisor_id', session.employee_id);

      const subIds = (subEmps || []).map((e) => e.employee_id);

      if (subIds.length === 0) {
        return NextResponse.json({ logs: [] });
      }

      const { data, error } = await supabaseAdmin
        .from('checkin_logs')
        .select('*, employees(name, department, position, supervisor_id)')
        .in('employee_id', subIds)
        .order('log_time', { ascending: false });

      if (error) console.error('Error fetching team checkin logs:', error);

      const formattedLogs = (data || []).map((l: any) => ({
        ...l,
        employee_name: l.employees?.name || l.employee_id,
        department: l.employees?.department,
        position: l.employees?.position,
      }));

      return NextResponse.json({ logs: formattedLogs });
    }

    let query = supabaseAdmin
      .from('checkin_logs')
      .select('*, employees(name, department, position, supervisor_id, role)')
      .order('log_time', { ascending: false });

    if (isOwner) {
      query = query.eq('employee_id', session.employee_id).eq('log_date', todayStr);
    } else if (isAdminView) {
      query = query.limit(200);
    }

    const { data, error } = await query;

    if (error) console.error('Error fetching checkin logs:', error);

    const formattedLogs = (data || []).map((l: any) => ({
      ...l,
      employee_name: l.employees?.name || l.employee_id,
      department: l.employees?.department,
      position: l.employees?.position,
    }));

    return NextResponse.json({ logs: formattedLogs });
  } catch (error) {
    console.error('GET checkin error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลเช็คอิน' }, { status: 500 });
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

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    const todayStr = now.toISOString().split('T')[0];

    // Fetch employee details
    const { data: employeeRecord } = await supabaseAdmin
      .from('employees')
      .select('position, supervisor_id, name')
      .eq('employee_id', session.employee_id)
      .maybeSingle();

    const employeePosition = employeeRecord?.position || null;

    // Fetch office GPS config
    let officeLat = 13.7563;
    let officeLng = 100.5018;
    let maxRadiusMeters = 500;

    const { data: configs } = await supabaseAdmin
      .from('app_config')
      .select('key, value');

    if (configs) {
      configs.forEach((c) => {
        if (c.key === 'office_lat') officeLat = parseFloat(c.value) || 13.7563;
        if (c.key === 'office_lng') officeLng = parseFloat(c.value) || 100.5018;
        if (c.key === 'max_allowed_radius_meters') maxRadiusMeters = parseFloat(c.value) || 500;
      });
    }

    // Determine basic location status
    const basicLocationStatus = determineVerificationStatus(
      gps_lat,
      gps_lng,
      officeLat,
      officeLng,
      maxRadiusMeters
    );

    let finalVerificationStatus: VerificationStatus = basicLocationStatus;
    let isEarlyLeave = false;

    // =========================================================================
    // RULE 1: เข้างานสาย (Cutoff 08:00:00 AM)
    // =========================================================================
    if (log_type === 'เข้างาน') {
      const isMorningLate = currentHour > 8 || (currentHour === 8 && (currentMinute > 0 || currentSecond > 0));

      if (isMorningLate && !note?.trim()) {
        return NextResponse.json(
          { error: 'เนื่องจากคุณเข้างานหลังเวลา 08:00 น. กรุณากรอกเหตุผลกรณีเข้าสายด้วยครับ' },
          { status: 400 }
        );
      }

      if (basicLocationStatus === 'ปฏิบัติงานที่ออฟฟิศ') {
        finalVerificationStatus = 'ปฏิบัติงานที่ออฟฟิศ';
      } else if (isMorningLate) {
        finalVerificationStatus = 'เข้างานสาย';
      } else {
        finalVerificationStatus = 'นอกพื้นที่ (WFH)';
      }
    }

    // =========================================================================
    // RULE 2: ยืนยันตัวตนรอบ 2 (บังคับ 13:00-13:20, เทียบ GPS กับจุดเช็คอินแรก <= 20 กม.)
    // =========================================================================
    if (log_type === 'ยืนยันตัวตน') {
      // 1. Fetch first check-in of today
      const { data: firstCheckIn } = await supabaseAdmin
        .from('checkin_logs')
        .select('*')
        .eq('employee_id', session.employee_id)
        .eq('log_date', todayStr)
        .eq('log_type', 'เข้างาน')
        .order('log_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!firstCheckIn) {
        return NextResponse.json(
          { error: 'ยังไม่มีการบันทึกเวลาเข้างานของวันนี้' },
          { status: 400 }
        );
      }

      // 2. Exemption check: If first check-in was at office -> Exempted
      if (firstCheckIn.verification_status === 'ปฏิบัติงานที่ออฟฟิศ') {
        return NextResponse.json(
          { error: 'ได้รับการยกเว้นไม่ต้องยืนยันตัวตนรอบ 2' },
          { status: 400 }
        );
      }

      // 3. Duplicate check for today
      const { data: existingVerify } = await supabaseAdmin
        .from('checkin_logs')
        .select('id')
        .eq('employee_id', session.employee_id)
        .eq('log_date', todayStr)
        .eq('log_type', 'ยืนยันตัวตน')
        .maybeSingle();

      if (existingVerify) {
        return NextResponse.json(
          { error: 'คุณได้รับการยืนยันตัวตนรอบ 2 ของวันนี้เรียบร้อยแล้ว' },
          { status: 400 }
        );
      }

      // 4. Time Check (13:00 - 13:20)
      if (currentHour < 13) {
        return NextResponse.json(
          { error: 'การยืนยันตัวตนรอบที่ 2 จะต้องทำตั้งแต่เวลา 13:00 น. เป็นต้นไป' },
          { status: 400 }
        );
      }

      const isLateVerify = currentHour > 13 || (currentHour === 13 && currentMinute > 20);
      if (isLateVerify && !note?.trim()) {
        return NextResponse.json(
          { error: 'เนื่องจากคุณยืนยันตัวตนหลังเวลา 13:20 น. กรุณากรอกเหตุผลกรณีล่าช้าด้วยครับ' },
          { status: 400 }
        );
      }

      // 5. GPS Movement Distance Check vs First Check-in GPS
      let distanceToFirstCheck = 0;
      let isOutOfBounds = false;

      if (gps_lat && gps_lng && firstCheckIn.gps_lat && firstCheckIn.gps_lng) {
        distanceToFirstCheck = calculateHaversineDistanceKm(
          gps_lat,
          gps_lng,
          firstCheckIn.gps_lat,
          firstCheckIn.gps_lng
        );

        if (distanceToFirstCheck > MAX_MOVEMENT_DISTANCE_KM) {
          isOutOfBounds = true;
          if (!out_of_bounds_reason?.trim()) {
            return NextResponse.json(
              {
                error: `ตำแหน่งพิกัดของคุณอยู่ห่างจากจุดเช็คอินแรกถึง ${distanceToFirstCheck.toFixed(
                  2
                )} กม. (เกิน 20 กม.) กรุณาระบุเหตุผลการเคลื่อนย้ายสถานที่ด้วยครับ`,
              },
              { status: 400 }
            );
          }
        }
      }

      // 6. Set Result Verification Status
      if (isLateVerify) {
        finalVerificationStatus = 'ยืนยันตัวตนสาย (ถือเป็นขาดงาน)';
      } else if (isOutOfBounds) {
        finalVerificationStatus = 'นอกรัศมี 20 กม. (ถือเป็นขาดงาน)';
      } else {
        finalVerificationStatus = 'ยืนยันตัวตนรอบ 2 สำเร็จ';
      }

      // Notify supervisor on late or out-of-bounds failure
      if ((isLateVerify || isOutOfBounds) && employeeRecord?.supervisor_id) {
        await createNotification({
          employee_id: employeeRecord.supervisor_id,
          type: 'missing_checkin',
          title: 'แจ้งเตือนยืนยันตัวตนรอบ 2 ไม่ผ่านเงื่อนไข',
          message: `พนักงาน ${session.name} (${session.employee_id}) ยืนยันตัวตนรอบ 2: ${finalVerificationStatus}`,
          link: '/supervisor',
        });
      }
    }

    // =========================================================================
    // RULE 4: ออกงานก่อน 17:00 (Early Leave)
    // =========================================================================
    if (log_type === 'ออกงาน') {
      isEarlyLeave = currentHour < 17;
      if (isEarlyLeave && !note?.trim()) {
        return NextResponse.json(
          { error: 'เนื่องจากคุณออกงานก่อนเวลา 17:00 น. กรุณากรอกเหตุผลกรณีออกก่อนเวลาด้วยครับ' },
          { status: 400 }
        );
      }

      finalVerificationStatus = isEarlyLeave ? 'ออกงานก่อนเวลา' : basicLocationStatus;
    }

    // Photo check for position requirement
    const isExempt = isPhotoOptionalForPosition(employeePosition);
    if (!isExempt && !photo_base64) {
      return NextResponse.json(
        { error: 'ตำแหน่งงานของคุณต้องใช้รูปถ่ายยืนยันตัวตน กรุณาเปิดกล้องถ่ายภาพ' },
        { status: 400 }
      );
    }

    let photoUrl = photo_base64 || null;

    // Upload photo to Supabase Storage if payload is base64
    if (photo_base64 && photo_base64.startsWith('data:image')) {
      try {
        const base64Data = photo_base64.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${session.employee_id}_${Date.now()}.jpg`;

        const { data: uploadResult, error: uploadError } = await supabaseAdmin.storage
          .from('checkin-photos')
          .upload(filename, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!uploadError && uploadResult) {
          const { data: urlData } = supabaseAdmin.storage
            .from('checkin-photos')
            .getPublicUrl(filename);
          photoUrl = urlData.publicUrl;
        }
      } catch (err) {
        console.warn('Storage upload warning, using base64 fallback:', err);
      }
    }

    const newLog: CheckinLog & { employee_name?: string } = {
      id: crypto.randomUUID(),
      employee_id: session.employee_id,
      employee_name: session.name,
      log_type,
      log_date: todayStr,
      log_time: now.toISOString(),
      gps_lat: gps_lat || null,
      gps_lng: gps_lng || null,
      photo_url: photoUrl,
      note: note || null,
      out_of_bounds_reason: out_of_bounds_reason || null,
      is_early_leave: isEarlyLeave,
      verification_status: finalVerificationStatus,
    };

    const { error: insertError } = await supabaseAdmin.from('checkin_logs').insert({
      employee_id: newLog.employee_id,
      log_type: newLog.log_type,
      log_date: newLog.log_date,
      log_time: newLog.log_time,
      gps_lat: newLog.gps_lat,
      gps_lng: newLog.gps_lng,
      photo_url: newLog.photo_url,
      note: newLog.note,
      out_of_bounds_reason: newLog.out_of_bounds_reason,
      is_early_leave: newLog.is_early_leave,
      verification_status: newLog.verification_status,
    });

    if (insertError) {
      console.error('Insert checkin error:', insertError);
      return NextResponse.json({ error: 'บันทึกข้อมูลไม่สำเร็จ' }, { status: 500 });
    }

    // =========================================================================
    // RULE 3: Random Spot Check Initialization upon WFH Morning Check-in
    // =========================================================================
    if (log_type === 'เข้างาน' && finalVerificationStatus !== 'ปฏิบัติงานที่ออฟฟิศ') {
      const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const { data: existingSpotChecks } = await supabaseAdmin
          .from('spot_checks')
          .select('id')
          .eq('employee_id', session.employee_id)
          .eq('check_date', todayStr);

        if (!existingSpotChecks || existingSpotChecks.length === 0) {
          // Uniform random time for Morning round between 09:00:00 and 11:00:00 (7200 sec range)
          const morningOffsetSec = Math.floor(Math.random() * 7200);
          const morningTotalSec = 9 * 3600 + morningOffsetSec;
          const morningH = String(Math.floor(morningTotalSec / 3600)).padStart(2, '0');
          const morningM = String(Math.floor((morningTotalSec % 3600) / 60)).padStart(2, '0');
          const morningS = String(morningTotalSec % 60).padStart(2, '0');
          const morningTimeStr = `${morningH}:${morningM}:${morningS}`;

          // Uniform random time for Afternoon round between 14:00:00 and 16:00:00 (7200 sec range)
          const afternoonOffsetSec = Math.floor(Math.random() * 7200);
          const afternoonTotalSec = 14 * 3600 + afternoonOffsetSec;
          const afternoonH = String(Math.floor(afternoonTotalSec / 3600)).padStart(2, '0');
          const afternoonM = String(Math.floor((afternoonTotalSec % 3600) / 60)).padStart(2, '0');
          const afternoonS = String(afternoonTotalSec % 60).padStart(2, '0');
          const afternoonTimeStr = `${afternoonH}:${afternoonM}:${afternoonS}`;

          await supabaseAdmin.from('spot_checks').insert([
            {
              check_date: todayStr,
              round: 'เช้า',
              scheduled_time: morningTimeStr,
              employee_id: session.employee_id,
              result_status: 'Scheduled',
            },
            {
              check_date: todayStr,
              round: 'บ่าย',
              scheduled_time: afternoonTimeStr,
              employee_id: session.employee_id,
              result_status: 'Scheduled',
            },
          ]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `ลงเวลา ${log_type} สำเร็จ (${finalVerificationStatus})`,
      log: newLog,
    });
  } catch (error) {
    console.error('POST checkin error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลงเวลา' }, { status: 500 });
  }
}

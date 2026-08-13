import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { calculateHaversineDistanceKm, MAX_MOVEMENT_DISTANCE_KM } from '@/lib/geo';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const { data } = await supabaseAdmin
      .from('spot_checks')
      .select('*')
      .eq('employee_id', session.employee_id)
      .eq('check_date', todayStr)
      .order('created_at', { ascending: false });

    return NextResponse.json({ spotChecks: data || [] });
  } catch (error) {
    console.error('GET spot check error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสุ่มตรวจ' }, { status: 500 });
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

    // Fetch first check-in of today for distance comparison
    const { data: firstCheckIn } = await supabaseAdmin
      .from('checkin_logs')
      .select('gps_lat, gps_lng')
      .eq('employee_id', session.employee_id)
      .eq('log_date', todayStr)
      .eq('log_type', 'เข้างาน')
      .order('log_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    let isOutOfBounds = false;
    let distanceKm = 0;

    if (gps_lat && gps_lng && firstCheckIn?.gps_lat && firstCheckIn?.gps_lng) {
      distanceKm = calculateHaversineDistanceKm(
        gps_lat,
        gps_lng,
        firstCheckIn.gps_lat,
        firstCheckIn.gps_lng
      );
      if (distanceKm > MAX_MOVEMENT_DISTANCE_KM) {
        isOutOfBounds = true;
      }
    }

    let photoUrl = photo_base64 || null;

    if (photo_base64 && photo_base64.startsWith('data:image')) {
      try {
        const base64Data = photo_base64.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `spot_${session.employee_id}_${Date.now()}.jpg`;

        const { data: uploadResult, error: uploadError } = await supabaseAdmin.storage
          .from('checkin-photos')
          .upload(filename, buffer, { contentType: 'image/jpeg', upsert: true });

        if (!uploadError && uploadResult) {
          const { data: urlData } = supabaseAdmin.storage
            .from('checkin-photos')
            .getPublicUrl(filename);
          photoUrl = urlData.publicUrl;
        }
      } catch (e) {
        console.warn('Spot check photo upload warning:', e);
      }
    }

    const finalResultStatus = isOutOfBounds
      ? `ไม่ผ่านการสุ่มตรวจ (นอกพื้นที่ ${distanceKm.toFixed(2)} กม.)`
      : 'Pass';

    const { error: updateError } = await supabaseAdmin
      .from('spot_checks')
      .update({
        gps_lat: gps_lat || null,
        gps_lng: gps_lng || null,
        photo_url: photoUrl,
        actual_scan_time: new Date().toISOString(),
        result_status: finalResultStatus,
      })
      .eq('id', spot_check_id)
      .eq('employee_id', session.employee_id);

    if (updateError) {
      console.error('Update spot check error:', updateError);
      return NextResponse.json({ error: 'บันทึกการสุ่มตรวจไม่สำเร็จ' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      result_status: finalResultStatus,
      message: isOutOfBounds
        ? `ตำแหน่งของคุณอยู่ห่างจากจุดเช็คอินแรกถึง ${distanceKm.toFixed(2)} กม. (${finalResultStatus})`
        : 'ยืนยันตัวตนสุ่มตรวจสำเร็จ (สถานะ: Pass)',
    });
  } catch (error) {
    console.error('POST spot check error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสุ่มตรวจ' }, { status: 500 });
  }
}

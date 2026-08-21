import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS } from '@/lib/gas';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const res = await callGAS('getSystemConfig');
    const cfg = res?.config || {};

    const formattedConfigs = [
      { key: 'office_lat', value: String(cfg.office_latitude || '12.736929') },
      { key: 'office_lng', value: String(cfg.office_longitude || '101.114387') },
      { key: 'max_allowed_radius_meters', value: String(cfg.office_radius_meters || '200') },
      { key: 'photo_exempt_positions', value: String(cfg.photo_exempt_positions || 'Senior, Manager, ซีเนียร์, ผู้จัดการ, ผจก, ผจก., หัวหน้า, Leader, Supervisor, Admin, Executive') },
    ];

    return NextResponse.json({ configs: formattedConfigs });
  } catch (error: any) {
    console.error('GET config error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงการตั้งค่าจาก Google Sheet' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();
    const { configs } = body; // Record<string, string>

    if (!configs || typeof configs !== 'object') {
      return NextResponse.json({ error: 'รูปแบบข้อมูลการตั้งค่าไม่ถูกต้อง' }, { status: 400 });
    }

    const gasResult = await callGAS('adminUpdateConfig', {
      officeLat: configs.office_lat,
      officeLng: configs.office_lng,
      officeRadius: configs.max_allowed_radius_meters,
      exemptPositions: configs.photo_exempt_positions,
      adminPin: '9999',
    });

    if (gasResult && !gasResult.success) {
      return NextResponse.json({ error: gasResult.message || 'บันทึกการตั้งค่าใน Google Sheet ไม่สำเร็จ' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกการตั้งค่าระบบลง Google Sheet เรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('POST config error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' }, { status: 500 });
  }
}

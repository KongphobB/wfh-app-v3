import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS, invalidateGasCache } from '@/lib/gas';
import { createAuditLog } from '@/lib/auditStore';
import {
  invalidateExemptConfigCache,
  getLocalExemptIds,
  saveLocalExemptIds,
  getExemptConfig,
  DEFAULT_EXEMPT_POSITIONS,
} from '@/lib/photoExempt';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const [res, exemptCfg] = await Promise.all([
      callGAS('getSystemConfig'),
      getExemptConfig(),
    ]);
    const cfg = res?.config || {};

    const cleanPositions = String(cfg.photo_exempt_positions || DEFAULT_EXEMPT_POSITIONS)
      .split(',')
      .map((p: string) => p.trim())
      .filter(
        (item) =>
          item &&
          !/^\d+$/.test(item) &&
          !item.startsWith('ID:') &&
          !item.toUpperCase().startsWith('OFF:') &&
          item !== '__AUTO_SUP_OFF__'
      )
      .join(', ');

    const formattedConfigs = [
      { key: 'office_lat', value: String(cfg.office_latitude || '12.736929') },
      { key: 'office_lng', value: String(cfg.office_longitude || '101.114387') },
      { key: 'max_allowed_radius_meters', value: String(cfg.office_radius_meters || '200') },
      { key: 'photo_exempt_positions', value: cleanPositions || DEFAULT_EXEMPT_POSITIONS },
      { key: 'auto_exempt_supervisors', value: exemptCfg.autoExemptSupervisors ? 'true' : 'false' },
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

    if (configs.office_lat !== undefined) {
      const lat = Number(configs.office_lat);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return NextResponse.json({ error: 'ค่า Latitude ของบริษัทไม่ถูกต้อง (ต้องอยู่ระหว่าง -90 ถึง 90)' }, { status: 400 });
      }
    }
    if (configs.office_lng !== undefined) {
      const lng = Number(configs.office_lng);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return NextResponse.json({ error: 'ค่า Longitude ของบริษัทไม่ถูกต้อง (ต้องอยู่ระหว่าง -180 ถึง 180)' }, { status: 400 });
      }
    }
    if (configs.max_allowed_radius_meters !== undefined) {
      const radius = Number(configs.max_allowed_radius_meters);
      if (!Number.isFinite(radius) || radius <= 0 || radius > 100000) {
        return NextResponse.json({ error: 'ค่ารัศมีอนุญาตไม่ถูกต้อง (ต้องมากกว่า 0 เมตร)' }, { status: 400 });
      }
    }

    const currentCfgRes = await callGAS('getSystemConfig').catch(() => null);
    const currentCfg = currentCfgRes?.config || {};

    const officeLatToSave = configs.office_lat !== undefined ? String(configs.office_lat) : String(currentCfg.office_latitude || '12.736929');
    const officeLngToSave = configs.office_lng !== undefined ? String(configs.office_lng) : String(currentCfg.office_longitude || '101.114387');
    const officeRadiusToSave = configs.max_allowed_radius_meters !== undefined ? String(configs.max_allowed_radius_meters) : String(currentCfg.office_radius_meters || '200');

    const localExemptIds = getLocalExemptIds();
    if (configs.auto_exempt_supervisors !== undefined) {
      if (String(configs.auto_exempt_supervisors) === 'false') {
        localExemptIds.add('__AUTO_SUP_OFF__');
      } else {
        localExemptIds.delete('__AUTO_SUP_OFF__');
      }
      saveLocalExemptIds(localExemptIds);
    }

    const rawPhotoPositions = configs.photo_exempt_positions !== undefined
      ? configs.photo_exempt_positions
      : (currentCfg.photo_exempt_positions || DEFAULT_EXEMPT_POSITIONS);

    const baseKeywords = String(rawPhotoPositions)
      .split(',')
      .map((p: string) => p.trim())
      .filter(
        (item) =>
          item &&
          !/^\d+$/.test(item) &&
          !item.startsWith('ID:') &&
          !item.toUpperCase().startsWith('OFF:') &&
          item !== '__AUTO_SUP_OFF__'
      );
    const mergedExemptPositions = [...baseKeywords, ...Array.from(localExemptIds)].join(', ');

    const gasResult = await callGAS('adminUpdateConfig', {
      officeLat: officeLatToSave,
      officeLng: officeLngToSave,
      officeRadius: officeRadiusToSave,
      exemptPositions: mergedExemptPositions,
      adminPin: '9999',
    });

    if (gasResult && !gasResult.success) {
      return NextResponse.json({ error: gasResult.message || 'บันทึกการตั้งค่าใน Google Sheet ไม่สำเร็จ' }, { status: 400 });
    }

    invalidateGasCache('getSystemConfig');
    invalidateExemptConfigCache();

    createAuditLog({
      admin_id: session.employee_id,
      admin_name: session.name,
      action_type: 'UPDATE_CONFIG',
      action_title: 'อัปเดตการตั้งค่าระบบ & พิกัดบริษัท',
      details: `${session.name} บันทึกการตั้งค่าระบบใหม่: พิกัด (${configs.office_lat}, ${configs.office_lng}) รัศมี: ${configs.max_allowed_radius_meters}m, ยกเว้นหัวหน้างานอัตโนมัติ: ${configs.auto_exempt_supervisors !== 'false' ? 'เปิด' : 'ปิด'}`,
    });

    return NextResponse.json({
      success: true,
      message: 'บันทึกการตั้งค่าระบบลง Google Sheet เรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('POST config error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' }, { status: 500 });
  }
}

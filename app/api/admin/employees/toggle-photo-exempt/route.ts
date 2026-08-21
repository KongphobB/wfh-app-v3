import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS, invalidateGasCache } from '@/lib/gas';
import { getLocalExemptIds, saveLocalExemptIds, getExemptConfig } from '@/lib/photoExempt';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();
    const { employee_id, is_exempt } = body;

    if (!employee_id) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสพนักงาน' }, { status: 400 });
    }

    const targetEmpId = String(employee_id).trim();
    const localIds = getLocalExemptIds();

    if (is_exempt) {
      localIds.add(targetEmpId);
    } else {
      localIds.delete(targetEmpId);
    }

    saveLocalExemptIds(localIds);

    // Sync to GAS in background
    try {
      const configRes = await callGAS('getSystemConfig');
      const cfg = configRes?.config || {};
      const rawList = String(
        cfg.photo_exempt_positions ||
          'Senior, Manager, ซีเนียร์, ผู้จัดการ, ผจก, ผจก., หัวหน้า, Leader, Supervisor, Admin, Executive'
      )
        .split(',')
        .map((p: string) => p.trim())
        .filter((item) => item && !/^\d+$/.test(item) && item !== targetEmpId);

      if (is_exempt) {
        rawList.push(targetEmpId);
      }

      await callGAS('adminUpdateConfig', {
        officeLat: cfg.office_latitude || '12.736929',
        officeLng: cfg.office_longitude || '101.114387',
        officeRadius: cfg.office_radius_meters || '200',
        exemptPositions: rawList.join(', '),
        adminPin: '9999',
      });
    } catch (gasErr) {
      console.warn('Background GAS sync error:', gasErr);
    }

    invalidateGasCache();

    return NextResponse.json({
      success: true,
      employee_id: targetEmpId,
      is_photo_exempt: is_exempt,
      message: is_exempt
        ? `เปิดสิทธิ์ยกเว้นการถ่ายภาพให้พนักงานรหัส ${targetEmpId} เรียบร้อยแล้ว`
        : `ปิดสิทธิ์ยกเว้นการถ่ายภาพสำหรับพนักงานรหัส ${targetEmpId} เรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    console.error('Toggle photo exempt error:', error);
    return NextResponse.json(
      { error: error?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์ยกเว้นถ่ายภาพ' },
      { status: 500 }
    );
  }
}

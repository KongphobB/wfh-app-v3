import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, setSessionCookie } from '@/lib/auth';
import { callGAS, invalidateGasCache } from '@/lib/gas';

const changePinSchema = z
  .object({
    oldPin: z.string().regex(/^\d{4}$/, 'PIN เดิมต้องเป็นตัวเลข 4 หลัก'),
    newPin: z.string().regex(/^\d{4}$/, 'PIN ใหม่ต้องเป็นตัวเลข 4 หลัก'),
    confirmPin: z.string().regex(/^\d{4}$/, 'ยืนยัน PIN ต้องเป็นตัวเลข 4 หลัก'),
  })
  .refine((data) => data.newPin === data.confirmPin, {
    message: 'รหัส PIN ใหม่ และ ยืนยัน PIN ไม่ตรงกัน',
    path: ['confirmPin'],
  })
  .refine((data) => data.newPin !== data.oldPin, {
    message: 'รหัส PIN ใหม่ต้องไม่ซ้ำกับรหัส PIN เดิม',
    path: ['newPin'],
  })
  .refine((data) => data.newPin !== '1234', {
    message: 'ไม่อนุญาตให้ตั้งรหัส PIN ใหม่เป็นค่าเริ่มต้น (1234)',
    path: ['newPin'],
  });

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    const body = await request.json();
    const validation = changePinSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { oldPin, newPin } = validation.data;

    // 1. Overwrite PIN directly in Google Sheet 'ข้อมูลพนักงาน' (Column G)
    const gasResult = await callGAS('changeEmployeePin', {
      employeeId: session.employee_id,
      oldPin,
      newPin,
    });

    if (gasResult && !gasResult.success) {
      return NextResponse.json(
        { error: gasResult.message || 'เปลี่ยนรหัส PIN ใน Google Sheet ไม่สำเร็จ' },
        { status: 400 }
      );
    }

    invalidateGasCache();

    // 2. Refresh session cookie with force_pin_change = false
    await setSessionCookie({
      ...session,
      force_pin_change: false,
    });

    try {
      const { createAuditLog } = await import('@/lib/auditStore');
      createAuditLog({
        admin_id: session.employee_id,
        admin_name: session.name,
        action_type: 'CHANGE_PIN',
        action_title: 'เปลี่ยนรหัส PIN ส่วนตัว',
        target_employee_id: session.employee_id,
        target_employee_name: session.name,
        details: `${session.name} (${session.employee_id}) เปลี่ยนรหัส PIN บัญชีผู้ใช้ของตนเองสำเร็จ`,
      });
    } catch (auditErr) {
      console.warn('Failed to write change-pin audit log:', auditErr);
    }

    const redirectPath =
      session.role === 'admin'
        ? '/admin'
        : session.role === 'supervisor'
        ? '/supervisor'
        : '/dashboard';

    return NextResponse.json({
      success: true,
      message: 'เปลี่ยนรหัส PIN สำเร็จเรียบร้อยแล้วใน Google Sheet',
      redirect: redirectPath,
    });
  } catch (error: any) {
    console.error('Change PIN error:', error);
    return NextResponse.json(
      { error: error?.message || 'เกิดข้อผิดพลาดในการเปลี่ยน PIN' },
      { status: 500 }
    );
  }
}

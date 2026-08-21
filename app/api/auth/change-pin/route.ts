import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, setSessionCookie } from '@/lib/auth';
import { callGAS } from '@/lib/gas';

const changePinSchema = z
  .object({
    oldPin: z.string().length(4, 'PIN เดิมต้องมี 4 หลัก'),
    newPin: z.string().length(4, 'PIN ใหม่ต้องมี 4 หลัก'),
    confirmPin: z.string().length(4, 'ยืนยัน PIN ต้องมี 4 หลัก'),
  })
  .refine((data) => data.newPin === data.confirmPin, {
    message: 'รหัส PIN ใหม่ และ ยืนยัน PIN ไม่ตรงกัน',
    path: ['confirmPin'],
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

    // 2. Refresh session cookie with force_pin_change = false
    await setSessionCookie({
      ...session,
      force_pin_change: false,
    });

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

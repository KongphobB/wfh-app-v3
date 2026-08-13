import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, hashPin, verifyPin, setSessionCookie } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

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

    // Fetch employee record from database
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('pin_hash')
      .eq('employee_id', session.employee_id)
      .maybeSingle();

    if (!employee) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 404 });
    }

    // Strictly verify old PIN against stored bcrypt pin_hash
    const isOldPinValid = await verifyPin(oldPin, employee.pin_hash);
    if (!isOldPinValid) {
      return NextResponse.json({ error: 'PIN เดิมไม่ถูกต้อง' }, { status: 400 });
    }

    // Hash new PIN and update employee record
    const newPinHash = await hashPin(newPin);
    await supabaseAdmin
      .from('employees')
      .update({
        pin_hash: newPinHash,
        force_pin_change: false,
        updated_at: new Date().toISOString(),
      })
      .eq('employee_id', session.employee_id);

    // Refresh session cookie with force_pin_change = false
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
      message: 'เปลี่ยนรหัส PIN สำเร็จ',
      redirect: redirectPath,
    });
  } catch (error) {
    console.error('Change PIN error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเปลี่ยน PIN' }, { status: 500 });
  }
}

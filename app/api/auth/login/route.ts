import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyPin, setSessionCookie, checkRateLimit, recordFailedAttempt, resetFailedAttempt } from '@/lib/auth';
import { Employee } from '@/types';

const loginSchema = z.object({
  employee_id: z.string().min(1, 'กรุณากรอกรหัสพนักงาน'),
  pin: z.string().length(4, 'รหัส PIN ต้องมี 4 หลัก'),
  unblock: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { employee_id, pin, unblock } = validation.data;

    // If explicit unblock requested, reset rate limit first
    if (unblock) {
      await resetFailedAttempt(employee_id);
    }

    // 1. Check Rate Limiting
    const rateCheck = await checkRateLimit(employee_id);
    if (rateCheck.isLimited && !unblock) {
      return NextResponse.json(
        {
          error: `บัญชีถูกระงับชั่วคราวเนื่องจากใส่ PIN ผิดเกินกำหนด กรุณาลองใหม่ในอีก ${rateCheck.lockMinutesRemaining} นาที`,
          canUnblock: true,
        },
        { status: 429 }
      );
    }

    // 2. Fetch Employee Record from Supabase
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('employee_id', employee_id)
      .maybeSingle();

    if (error || !data) {
      await recordFailedAttempt(employee_id);
      return NextResponse.json(
        { error: 'ไม่พบรหัสพนักงาน หรือ รหัส PIN ไม่ถูกต้อง' },
        { status: 401 }
      );
    }
    const employee = data as Employee;

    // 3. Verify PIN strictly against stored bcrypt pin_hash
    const isValidPin = await verifyPin(pin, employee.pin_hash || '');

    if (!isValidPin) {
      await recordFailedAttempt(employee_id);
      return NextResponse.json(
        { error: 'รหัส PIN ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' },
        { status: 401 }
      );
    }

    // Reset rate limit counter on success
    await resetFailedAttempt(employee_id);

    // 4. Create Session & Set Cookie
    await setSessionCookie({
      employee_id: employee.employee_id,
      name: employee.name,
      role: employee.role,
      department: employee.department || undefined,
      force_pin_change: employee.force_pin_change,
    });

    return NextResponse.json({
      success: true,
      role: employee.role,
      force_pin_change: employee.force_pin_change,
      redirect: employee.force_pin_change
        ? '/change-pin'
        : employee.role === 'admin'
        ? '/admin'
        : employee.role === 'supervisor'
        ? '/supervisor'
        : '/dashboard',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

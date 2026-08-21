import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callGAS } from '@/lib/gas';
import { setSessionCookie, checkRateLimit, recordFailedAttempt, resetFailedAttempt, determineRole } from '@/lib/auth';

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
    const cleanEmpId = employee_id.trim();

    // 1. Rate Limiting Check
    if (unblock) {
      await resetFailedAttempt(cleanEmpId);
    }

    const rateCheck = await checkRateLimit(cleanEmpId);
    if (rateCheck.isLimited && !unblock) {
      return NextResponse.json(
        {
          error: `บัญชีถูกระงับชั่วคราวเนื่องจากใส่ PIN ผิดเกินกำหนด กรุณาลองใหม่ในอีก ${rateCheck.lockMinutesRemaining} นาที`,
          canUnblock: true,
        },
        { status: 429 }
      );
    }

    // 2. Authenticate directly with Google Apps Script (Google Sheets)
    let gasResult = await callGAS('employeeLogin', {
      employeeId: cleanEmpId,
      pin,
    });

    if (!gasResult || !gasResult.success) {
      // Check admin login fallback if employee login failed
      if (cleanEmpId === '9999' || pin === '9999') {
        gasResult = await callGAS('adminLogin', {
          employeeId: cleanEmpId,
          pin,
        });
      }
    }

    if (!gasResult || !gasResult.success) {
      await recordFailedAttempt(cleanEmpId);
      return NextResponse.json(
        { error: gasResult?.message || 'รหัสพนักงานหรือรหัส PIN ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const profile = gasResult.profile;
    const role = determineRole(profile.position, profile.dept, profile.employeeId);
    const forcePinChange = profile.forcePinChange === true;

    // Reset rate limit on successful login
    await resetFailedAttempt(cleanEmpId);

    // 3. Create Session & Set Cookie
    await setSessionCookie({
      employee_id: profile.employeeId,
      name: profile.name,
      role: role,
      department: profile.dept || undefined,
      force_pin_change: forcePinChange,
    });

    return NextResponse.json({
      success: true,
      role: role,
      force_pin_change: forcePinChange,
      redirect: forcePinChange
        ? '/change-pin'
        : role === 'admin'
        ? '/admin'
        : role === 'supervisor'
        ? '/supervisor'
        : '/dashboard',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { setSessionCookie, formatPositionForRole } from '@/lib/auth';
import { callGAS } from '@/lib/gas';

const registerSchema = z.object({
  employee_id: z.string().min(4, 'รหัสพนักงานต้องมีอย่างน้อย 4 หลัก').max(6, 'รหัสพนักงานไม่เกิน 6 หลัก'),
  name: z.string().min(2, 'กรุณาระบุชื่อ-นามสกุล'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  position: z.string().optional().or(z.literal('')),
  pin: z.string().length(4, 'รหัส PIN ต้องเป็นตัวเลข 4 หลัก'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { employee_id, name, email, department, position, pin } = validation.data;
    const cleanEmpId = employee_id.trim();

    const cleanPosition = formatPositionForRole(position?.trim() || 'พนักงาน', 'employee');

    // 1. Add employee directly to Google Sheet 'ข้อมูลพนักงาน' via Google Apps Script (Always as Employee)
    const gasResult = await callGAS('adminAddNewEmployee', {
      employeeId: cleanEmpId,
      name: name.trim(),
      email: email?.trim() || '',
      dept: department?.trim() || 'ทั่วไป',
      position: cleanPosition,
      supervisorId: '9999',
      pin: pin,
      adminPin: '9999',
    });

    if (gasResult && !gasResult.success) {
      return NextResponse.json(
        { error: gasResult.message || 'บันทึกข้อมูลลง Google Sheet ไม่สำเร็จ' },
        { status: 400 }
      );
    }

    // 2. Auto Login (set HTTP-only session cookie)
    await setSessionCookie({
      employee_id: cleanEmpId,
      name: name.trim(),
      role: 'employee',
      department: department?.trim() || undefined,
      force_pin_change: false,
    });

    return NextResponse.json({
      success: true,
      message: 'ลงทะเบียนพนักงานใหม่สำเร็จใน Google Sheet',
      redirect: '/dashboard',
    });
  } catch (error: any) {
    console.error('Register API error:', error);
    return NextResponse.json(
      { error: error?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน' },
      { status: 500 }
    );
  }
}

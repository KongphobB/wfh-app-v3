import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPin, setSessionCookie } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Employee } from '@/types';

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

    // 1. Check if employee_id already exists in Supabase
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('employees')
      .select('employee_id')
      .eq('employee_id', cleanEmpId)
      .maybeSingle();

    if (checkError) {
      console.error('Check existing employee error:', checkError);
    }

    if (existing) {
      return NextResponse.json(
        { error: `รหัสพนักงาน ${cleanEmpId} มีในระบบอยู่แล้ว กรุณาใช้รหัสอื่นหรือล็อกอิน` },
        { status: 400 }
      );
    }

    // 2. Hash PIN with bcrypt (10 rounds)
    const pin_hash = await hashPin(pin);
    const nowIso = new Date().toISOString();

    const newEmployee: Employee = {
      employee_id: cleanEmpId,
      name: name.trim(),
      email: email?.trim() || null,
      department: department?.trim() || null,
      position: position?.trim() || null,
      supervisor_id: null,
      pin_hash,
      one_star_count: 0,
      wfh_status: 'เปิดสิทธิ์',
      force_pin_change: false,
      role: 'employee',
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { error: insertError } = await supabaseAdmin.from('employees').insert({
      employee_id: newEmployee.employee_id,
      name: newEmployee.name,
      email: newEmployee.email,
      department: newEmployee.department,
      position: newEmployee.position,
      pin_hash: newEmployee.pin_hash,
      one_star_count: 0,
      wfh_status: 'เปิดสิทธิ์',
      force_pin_change: false,
      role: 'employee',
    });

    if (insertError) {
      console.error('Insert registered employee error:', insertError);
      return NextResponse.json(
        { error: `ลงทะเบียนไม่สำเร็จ: ${insertError.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'}` },
        { status: 500 }
      );
    }

    // 3. Auto Login (set HTTP-only session cookie)
    await setSessionCookie({
      employee_id: newEmployee.employee_id,
      name: newEmployee.name,
      role: newEmployee.role,
      department: newEmployee.department || undefined,
      force_pin_change: false,
    });

    return NextResponse.json({
      success: true,
      message: 'ลงทะเบียนพนักงานใหม่สำเร็จ',
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

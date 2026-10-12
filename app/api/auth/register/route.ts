import { NextResponse } from 'next/server';
import { z } from 'zod';
import { setSessionCookie, formatPositionForRole } from '@/lib/auth';
import { callGAS, getLiveEmployeesMap, invalidateGasCache } from '@/lib/gas';
import { createAuditLog } from '@/lib/auditStore';
import { createNotification, createNotificationForAdmins } from '@/lib/notifications';

const registerSchema = z.object({
  employee_id: z.string().trim().min(4, 'รหัสพนักงานต้องมีอย่างน้อย 4 หลัก').max(6, 'รหัสพนักงานไม่เกิน 6 หลัก'),
  name: z.string().trim().min(2, 'กรุณาระบุชื่อ-นามสกุล'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  position: z.string().optional().or(z.literal('')),
  pin: z.string().regex(/^\d{4}$/, 'รหัส PIN ต้องเป็นตัวเลข 4 หลัก'),
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

    // Prevent registering reserved administrative/system IDs
    if (cleanEmpId === '9999' || cleanEmpId === '8888' || cleanEmpId === '9988') {
      return NextResponse.json(
        { error: 'รหัสพนักงานนี้สงวนไว้สำหรับระบบ ไม่สามารถใช้ลงทะเบียนได้' },
        { status: 400 }
      );
    }

    // Prevent overwriting an already-registered employee ID
    const existingEmployees = await getLiveEmployeesMap();
    if (existingEmployees[cleanEmpId]) {
      return NextResponse.json(
        { error: 'รหัสพนักงานนี้ถูกลงทะเบียนในระบบแล้ว กรุณาเข้าสู่ระบบ' },
        { status: 400 }
      );
    }

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

    invalidateGasCache();

    // 2. Audit Trail Log
    createAuditLog({
      admin_id: cleanEmpId,
      admin_name: name.trim(),
      action_type: 'CREATE_EMPLOYEE',
      action_title: 'ลงทะเบียนพนักงานใหม่',
      target_employee_id: cleanEmpId,
      target_employee_name: name.trim(),
      details: `พนักงานลงทะเบียนใหม่ด้วยตนเอง: ${name.trim()} (${cleanEmpId}) แผนก: ${department?.trim() || 'ทั่วไป'}`,
    });

    // 3. Welcome Notification for employee & Admin Alert
    try {
      await Promise.all([
        createNotification({
          employee_id: cleanEmpId,
          type: 'system',
          title: 'ยินดีต้อนรับสู่ระบบ WFH',
          message: `สวัสดีคุณ ${name.trim()} บัญชีของคุณพร้อมใช้งานแล้ว เริ่มต้นลงเวลาทำงานและตรวจสอบสิทธิ์ได้ทันที`,
          link: '/dashboard',
        }),
        createNotificationForAdmins({
          type: 'system',
          title: 'พนักงานใหม่ลงทะเบียน',
          message: `มีพนักงานลงทะเบียนใหม่: ${name.trim()} (${cleanEmpId}) แผนก: ${department?.trim() || 'ทั่วไป'}`,
          link: '/admin',
        }),
      ]);
    } catch (e) {
      console.warn('Failed to dispatch welcome notifications:', e);
    }

    // 4. Auto Login (set HTTP-only session cookie)
    await setSessionCookie({
      employee_id: cleanEmpId,
      name: name.trim(),
      role: 'employee',
      department: department?.trim() || undefined,
      force_pin_change: pin === '1234',
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

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, hashPin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

const createEmployeeSchema = z.object({
  employee_id: z.string().min(1, 'กรุณาระบุรหัสพนักงาน 4 หลัก'),
  name: z.string().min(1, 'กรุณาระบุชื่อ-นามสกุล'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  department: z.string().optional(),
  position: z.string().optional(),
  supervisor_id: z.string().optional().nullable(),
  role: z.enum(['employee', 'supervisor', 'admin']),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .order('employee_id', { ascending: true });

    if (error) console.error('Fetch employees error:', error);
    return NextResponse.json({ employees: data || [] });
  } catch (error) {
    console.error('GET admin employees error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลพนักงาน' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createEmployeeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const newEmpData = validation.data;
    const defaultPinHash = await hashPin('1234'); // Default PIN 1234

    const { error: insertError } = await supabaseAdmin.from('employees').insert({
      employee_id: newEmpData.employee_id,
      name: newEmpData.name,
      email: newEmpData.email || null,
      department: newEmpData.department || null,
      position: newEmpData.position || null,
      supervisor_id: newEmpData.supervisor_id || null,
      pin_hash: defaultPinHash,
      force_pin_change: true, // Requires employee to set new PIN on first login
      role: newEmpData.role,
      wfh_status: 'เปิดสิทธิ์',
      one_star_count: 0,
    });

    if (insertError) {
      console.error('Insert employee error:', insertError);
      return NextResponse.json({ error: 'สร้างข้อมูลพนักงานไม่สำเร็จ (รหัสพนักงานซ้ำซ้อน)' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `สร้างพนักงาน ${newEmpData.name} สำเร็จ (PIN เริ่มต้น: 1234)`,
    });
  } catch (error) {
    console.error('POST employee error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างพนักงาน' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();
    const { employee_id, action, name, email, wfh_status, reset_pin, role, supervisor_id, department, position } = body;

    if (!employee_id) {
      return NextResponse.json({ error: 'ไม่ระบุรหัสพนักงาน' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name) updatePayload.name = name;
    if (email !== undefined) updatePayload.email = email || null;
    if (wfh_status) updatePayload.wfh_status = wfh_status;
    if (role) updatePayload.role = role;
    if (department !== undefined) updatePayload.department = department || null;
    if (position !== undefined) updatePayload.position = position || null;
    if (supervisor_id !== undefined) updatePayload.supervisor_id = supervisor_id || null;

    if (reset_pin) {
      updatePayload.pin_hash = await hashPin('1234');
      updatePayload.force_pin_change = true;
    }

    if (action === 'clear_stars') {
      updatePayload.one_star_count = 0;
      updatePayload.wfh_status = 'เปิดสิทธิ์';
    }

    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update(updatePayload)
      .eq('employee_id', employee_id);

    if (updateError) {
      console.error('Update employee error:', updateError);
      return NextResponse.json({ error: 'แก้ไขข้อมูลไม่สำเร็จ' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'อัปเดตข้อมูลพนักงานเรียบร้อยแล้ว',
    });
  } catch (error) {
    console.error('PATCH employee error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตพนักงาน' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');

    if (!employee_id) {
      return NextResponse.json({ error: 'ไม่ระบุรหัสพนักงาน' }, { status: 400 });
    }

    if (employee_id === session.employee_id) {
      return NextResponse.json({ error: 'ไม่สามารถลบบัญชีแอดมินของตนเองได้' }, { status: 400 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('employee_id', employee_id);

    if (deleteError) {
      console.error('Delete employee error:', deleteError);
      return NextResponse.json({ error: 'ลบข้อมูลพนักงานไม่สำเร็จ (ข้อมูลอาจมีการเชื่อมโยงอยู่)' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `ลบพนักงานรหัส ${employee_id} เรียบร้อยแล้ว`,
    });
  } catch (error) {
    console.error('DELETE employee error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบพนักงาน' }, { status: 500 });
  }
}

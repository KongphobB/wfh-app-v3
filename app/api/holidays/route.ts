import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import {
  getAllHolidays,
  getHolidayPolicyDoc,
  addCustomHoliday,
  updateHoliday,
  deleteHoliday,
  updateHolidayPolicyDoc,
} from '@/lib/holidayStore';

export const dynamic = 'force-dynamic';

const CreateHolidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)'),
  name: z.string().min(2, 'ชื่อวันหยุดต้องมีความยาวอย่างน้อย 2 ตัวอักษร'),
  name_en: z.string().optional(),
  notes: z.string().optional(),
});

const UpdatePolicySchema = z.object({
  file_name: z.string().min(1, 'ระบุชื่อไฟล์'),
  file_url: z.string().min(1, 'ระบุ URL หรือข้อมูลไฟล์'),
  file_type: z.enum(['pdf', 'image', 'link']),
  file_size: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const holidays = getAllHolidays();
    const policyDoc = getHolidayPolicyDoc();

    return NextResponse.json({
      success: true,
      holidays,
      policyDoc,
      role: session.role,
    });
  } catch (error: any) {
    console.error('GET holidays error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch holidays' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
      return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบหรือหัวหน้างานเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = CreateHolidaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง กรุณากรอกวันที่และชื่อวันหยุด' }, { status: 400 });
    }

    const newHol = addCustomHoliday({
      date: parsed.data.date,
      name: parsed.data.name,
      name_en: parsed.data.name_en,
      notes: parsed.data.notes,
    });

    try {
      const { createAuditLog } = await import('@/lib/auditStore');
      createAuditLog({
        admin_id: session.employee_id,
        admin_name: session.name,
        action_type: 'ADD_HOLIDAY',
        action_title: 'เพิ่มวันหยุดพิเศษของบริษัท',
        details: `${session.name} เพิ่มวันหยุดบริษัท: "${newHol.name}" วันที่ ${newHol.date}`,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'เพิ่มวันหยุดพิเศษของบริษัทเรียบร้อยแล้ว',
      data: newHol,
    });
  } catch (error: any) {
    console.error('Add holiday error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to add holiday' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
      return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบหรือหัวหน้างานเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();

    // Mode 1: Update attached policy document
    if (body.type === 'policy_doc') {
      const parsed = UpdatePolicySchema.safeParse(body.policyDoc);
      if (!parsed.success) {
        return NextResponse.json({ error: 'ข้อมูลไฟล์ประกาศไม่ถูกต้อง' }, { status: 400 });
      }

      const updatedDoc = updateHolidayPolicyDoc({
        file_name: parsed.data.file_name,
        file_url: parsed.data.file_url,
        file_type: parsed.data.file_type,
        file_size: parsed.data.file_size || null,
        uploaded_at: new Date().toISOString(),
        uploaded_by: `${session.name} (${session.employee_id})`,
      });

      try {
        const { createAuditLog } = await import('@/lib/auditStore');
        createAuditLog({
          admin_id: session.employee_id,
          admin_name: session.name,
          action_type: 'UPDATE_POLICY_DOC',
          action_title: 'อัปเดตไฟล์ประกาศวันหยุดบริษัท',
          details: `${session.name} อัปโหลด/เปลี่ยนไฟล์ประกาศวันหยุด: "${updatedDoc?.file_name}" (${updatedDoc?.file_size || 'ไม่ระบุขนาด'})`,
        });
      } catch {}

      return NextResponse.json({
        success: true,
        message: 'อัปเดตไฟล์ประกาศวันหยุดบริษัทเรียบร้อยแล้ว',
        policyDoc: updatedDoc,
      });
    }

    // Mode 2: Update individual holiday
    const updated = updateHoliday({
      id: body.id,
      name: body.name,
      name_en: body.name_en,
      date: body.date,
      is_active: body.is_active,
      notes: body.notes,
    });

    if (!updated) {
      return NextResponse.json({ error: 'ไม่พบวันหยุดนี้' }, { status: 404 });
    }

    try {
      const { createAuditLog } = await import('@/lib/auditStore');
      createAuditLog({
        admin_id: session.employee_id,
        admin_name: session.name,
        action_type: 'TOGGLE_HOLIDAY',
        action_title: updated.is_active ? 'เปิดใช้งานวันหยุด' : 'ปิดการใช้งานวันหยุด',
        details: `${session.name} ${updated.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} วันหยุด "${updated.name}" (${updated.date})`,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'อัปเดตข้อมูลวันหยุดเรียบร้อยแล้ว',
      data: updated,
    });
  } catch (error: any) {
    console.error('Update holiday error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update holiday' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
      return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบหรือหัวหน้างานเท่านั้น' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ไม่ระบุรหัสวันหยุด' }, { status: 400 });
    }

    const deleted = deleteHoliday(id);
    if (!deleted) {
      return NextResponse.json({ error: 'ไม่พบวันหยุดนี้ หรือไม่สามารถลบได้' }, { status: 404 });
    }

    try {
      const { createAuditLog } = await import('@/lib/auditStore');
      createAuditLog({
        admin_id: session.employee_id,
        admin_name: session.name,
        action_type: 'DELETE_HOLIDAY',
        action_title: 'ลบวันหยุดพิเศษของบริษัท',
        details: `${session.name} ลบวันหยุดพิเศษรหัส ${id}`,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'ลบวันหยุดเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Delete holiday error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete holiday' }, { status: 500 });
  }
}

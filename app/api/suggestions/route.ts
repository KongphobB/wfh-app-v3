import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getSuggestionsForUser, createSuggestion, updateSuggestionStatus } from '@/lib/suggestionStore';
import { createNotificationForAdmins, createNotification } from '@/lib/notifications';
import { SuggestionCategory, SuggestionStatus } from '@/types';

export const dynamic = 'force-dynamic';

const CreateSuggestionSchema = z.object({
  topic: z.string().min(2, 'หัวข้อต้องมีความยาวอย่างน้อย 2 ตัวอักษร'),
  category: z.enum(['ทั่วไป', 'การทำงาน WFH', 'ระบบและอุปกรณ์', 'สวัสดิการและสถานที่', 'อื่นๆ']),
  content: z.string().min(5, 'กรุณาระบุรายละเอียดข้อเสนอแนะอย่างน้อย 5 ตัวอักษร'),
  is_anonymous: z.boolean().default(false),
});

const UpdateSuggestionSchema = z.object({
  id: z.string().min(1, 'ไม่ระบุรหัสข้อเสนอแนะ'),
  status: z.enum(['New', 'In Progress', 'Resolved']),
  admin_note: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const items = getSuggestionsForUser(session.employee_id, session.role);
    return NextResponse.json({
      success: true,
      data: items,
      role: session.role,
    });
  } catch (error: any) {
    console.error('GET suggestions error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch suggestions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateSuggestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง กรุณากรอกหัวข้อและรายละเอียดให้ครบถ้วน' }, { status: 400 });
    }

    const isAnon = parsed.data.is_anonymous;
    const newSug = createSuggestion({
      topic: parsed.data.topic,
      category: parsed.data.category as SuggestionCategory,
      content: parsed.data.content,
      is_anonymous: isAnon,
      employee_id: session.employee_id,
      employee_name: session.name,
      department: session.department,
    });

    // Notify admins
    await createNotificationForAdmins({
      type: 'system',
      title: `💬 ข้อเสนอแนะใหม่: ${parsed.data.topic}`,
      message: `มีข้อเสนอแนะใหม่ในหมวดหมู่ "${parsed.data.category}" (${isAnon ? 'ไม่ระบุตัวตน' : session.name})`,
      link: '/admin',
    });

    return NextResponse.json({
      success: true,
      message: 'ส่งข้อเสนอแนะเรียบร้อยแล้ว ขอบคุณสำหรับความคิดเห็นที่เป็นประโยชน์ครับ',
      data: newSug,
    });
  } catch (error: any) {
    console.error('Submit suggestion error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to submit suggestion' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
      return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบหรือหัวหน้างานเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpdateSuggestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'ข้อมูลอัปเดตไม่ถูกต้อง' }, { status: 400 });
    }

    const updated = updateSuggestionStatus({
      id: parsed.data.id,
      status: parsed.data.status as SuggestionStatus,
      admin_note: parsed.data.admin_note,
    });

    if (!updated) {
      return NextResponse.json({ error: 'ไม่พบรายการข้อเสนอแนะนี้' }, { status: 404 });
    }

    // If submitter is known, notify them about the update
    if (updated.employee_id) {
      await createNotification({
        employee_id: updated.employee_id,
        type: 'system',
        title: `💬 ข้อเสนอแนะของคุณได้รับการอัปเดตสถานะ: ${updated.status}`,
        message: updated.admin_note
          ? `แอดมินได้บันทึกตอบรับข้อเสนอแนะ "${updated.topic}": ${updated.admin_note}`
          : `แอดมินได้ปรับสถานะข้อเสนอแนะ "${updated.topic}" เป็น ${updated.status}`,
        link: '/dashboard',
      });
    }

    // Record Audit Log
    try {
      const { createAuditLog } = await import('@/lib/auditStore');
      createAuditLog({
        admin_id: session.employee_id,
        admin_name: session.name,
        action_type: 'RESPOND_SUGGESTION',
        action_title: 'ตอบรับข้อเสนอแนะ',
        target_employee_id: updated.employee_id || undefined,
        target_employee_name: updated.is_anonymous ? 'ไม่ระบุตัวตน' : (updated.employee_name || undefined),
        details: `${session.name} ปรับสถานะข้อเสนอแนะ "${updated.topic}" เป็น "${updated.status}" ${updated.admin_note ? `[บันทึกตอบรับ: ${updated.admin_note}]` : ''}`,
      });
    } catch (auditErr) {
      console.warn('Failed to write suggestion audit log:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'อัปเดตสถานะข้อเสนอแนะเรียบร้อยแล้ว',
      data: updated,
    });
  } catch (error: any) {
    console.error('Update suggestion error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update suggestion' }, { status: 500 });
  }
}

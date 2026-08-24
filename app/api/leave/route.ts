import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getLeaveRequestsForUser, createLeaveRequest, updateLeaveStatus } from '@/lib/leaveStore';
import { createNotification, createNotificationForAdmins } from '@/lib/notifications';
import { LeaveType, LeaveStatus } from '@/types';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateLeaveSchema = z.object({
  leave_type: z.enum(['ลาป่วย', 'ลากิจ', 'ลาพักร้อน', 'ปฏิบัติงานที่ออฟฟิศ (Onsite)']),
  start_date: z.string().min(10),
  end_date: z.string().min(10),
  reason: z.string().min(3),
});

const UpdateLeaveSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['Approved', 'Rejected']),
  review_note: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const requests = getLeaveRequestsForUser(session.employee_id, session.role);
    return NextResponse.json({
      success: true,
      data: requests,
      role: session.role,
    });
  } catch (error: any) {
    console.error('Fetch leave error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'ข้อมูลคำขอลาไม่ถูกต้อง กรุณาระบุข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const newRequest = createLeaveRequest({
      employee_id: session.employee_id,
      employee_name: session.name,
      department: session.department || null,
      leave_type: parsed.data.leave_type as LeaveType,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      reason: parsed.data.reason,
    });

    // Notify admins / supervisor
    await createNotificationForAdmins({
      type: 'ticket',
      title: `📅 คำขอลาใหม่: ${session.name} (${parsed.data.leave_type})`,
      message: `พนักงาน ${session.name} ขอ${parsed.data.leave_type} วันที่ ${parsed.data.start_date} ถึง ${parsed.data.end_date} เหตุผล: ${parsed.data.reason}`,
      link: '/leave',
    });

    return NextResponse.json({
      success: true,
      message: 'ยื่นคำขอลาเรียบร้อยแล้ว ระบบจะยกเว้นการแจ้งเตือนขาดงานเมื่อได้รับการอนุมัติ',
      data: newRequest,
    });
  } catch (error: any) {
    console.error('Submit leave error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to submit leave request' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    if (session.role !== 'supervisor' && session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะหัวหน้างานหรือผู้ดูแลระบบเท่านั้นที่สามารถอนุมัติคำขอลาได้' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpdateLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'ข้อมูลการพิจารณาไม่ถูกต้อง' }, { status: 400 });
    }

    const updated = updateLeaveStatus({
      id: parsed.data.id,
      status: parsed.data.status as LeaveStatus,
      reviewed_by: `${session.employee_id} (${session.name})`,
      review_note: parsed.data.review_note,
    });

    if (!updated) {
      return NextResponse.json({ error: 'ไม่พบรายการคำขอดังกล่าว' }, { status: 404 });
    }

    // Notify the employee about the approval/rejection
    await createNotification({
      employee_id: updated.employee_id,
      type: updated.status === 'Approved' ? 'task_rated' : 'warning',
      title: updated.status === 'Approved' ? '✅ คำขอลาได้รับการอนุมัติแล้ว' : '❌ คำขอลาไม่ได้รับการอนุมัติ',
      message: `คำขอ${updated.leave_type} (${updated.start_date} - ${updated.end_date}) ได้รับการพิจารณาเป็น: ${updated.status === 'Approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'}${parsed.data.review_note ? ` (หมายเหตุ: ${parsed.data.review_note})` : ''}`,
      link: '/leave',
    });

    return NextResponse.json({
      success: true,
      message: `บันทึกผลการพิจารณา (${updated.status}) สำเร็จ`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update leave error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update leave status' }, { status: 500 });
  }
}

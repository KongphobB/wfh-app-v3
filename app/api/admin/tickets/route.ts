import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS } from '@/lib/gas';
import { Ticket } from '@/types';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const gasRes = await callGAS('getLogs', { logType: 'ticket', limit: 300 });
    const rawTickets = (gasRes?.data || []) as any[];

    let filtered = rawTickets;
    if (session.role === 'employee') {
      filtered = rawTickets.filter((t) => String(t.employeeId) === String(session.employee_id));
    }

    const formatted: Ticket[] = filtered.map((t) => ({
      id: t.uuid || t.ticketId || `${t.employeeId}_${t.date}`,
      employee_id: String(t.employeeId),
      employee_name: t.name || t.employeeName || t.employeeId,
      problem_type: t.issueType || t.type || t.problemType || 'ปัญหาทั่วไป',
      description: t.details || t.description || null,
      status: t.status || 'Pending',
      admin_notes: t.adminNotes || t.notes || null,
      created_at: t.dateTime ? `${t.dateTime.replace(' ', 'T')}+07:00` : `${t.date || '2026-08-19'}T09:00:00Z`,
    }));

    return NextResponse.json({ tickets: formatted });
  } catch (error: any) {
    console.error('GET tickets error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงรายการ Ticket จาก Google Sheet' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const body = await request.json();
    const { problem_type, description } = body;

    if (!problem_type) {
      return NextResponse.json({ error: 'กรุณาระบุหมวดหมู่ปัญหา' }, { status: 400 });
    }

    const gasResult = await callGAS('submitTicket', {
      employeeId: session.employee_id,
      problemType: problem_type,
      details: description || '',
    });

    if (gasResult && !gasResult.success) {
      return NextResponse.json({ error: gasResult.message || 'ส่ง Ticket ลง Google Sheet ไม่สำเร็จ' }, { status: 400 });
    }

    // In-app notification to Admin
    try {
      const { invalidateGasCache } = await import('@/lib/gas');
      const { createNotificationForAdmins } = await import('@/lib/notifications');
      invalidateGasCache();
      await createNotificationForAdmins({
        type: 'ticket',
        title: `🎫 มีการแจ้งปัญหาใหม่: ${problem_type}`,
        message: `คุณ ${session.name || session.employee_id} (${session.employee_id}) แจ้ง: "${description || problem_type}"`,
        link: '/admin',
      });
    } catch (notifErr) {
      console.warn('Failed to create ticket notification:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'ส่ง Ticket แจ้งปัญหาลง Google Sheet เรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('POST ticket error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการสร้าง Ticket' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();
    const { ticket_id, status, admin_notes } = body;

    if (!ticket_id || !status) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const { invalidateGasCache } = await import('@/lib/gas');

    const gasResult = await callGAS('resolveTicket', {
      ticketId: ticket_id,
      status: status,
      adminNotes: admin_notes || 'แก้ไขเรียบร้อย',
      adminPin: '9998',
      pin: '9998',
    });

    invalidateGasCache();

    if (gasResult && !gasResult.success) {
      return NextResponse.json({ error: gasResult.message || 'อัปเดต Ticket ใน Google Sheet ไม่สำเร็จ' }, { status: 400 });
    }

    // Notify employee that their ticket has been resolved
    try {
      const { createNotification } = await import('@/lib/notifications');
      const gasRes = await callGAS('getLogs', { logType: 'ticket', limit: 200 });
      const rawTickets = (gasRes?.data || []) as any[];
      const target = rawTickets.find((t) => t.uuid === ticket_id || t.ticketId === ticket_id || t.id === ticket_id);
      if (target?.employeeId) {
        await createNotification({
          employee_id: String(target.employeeId),
          type: 'ticket',
          title: '✅ ตั๋วแจ้งปัญหาของคุณได้รับการแก้ไขแล้ว',
          message: admin_notes ? `แอดมินตอบกลับ: "${admin_notes}"` : 'แอดมินได้ตรวจสอบและแก้ไขปัญหาให้เรียบร้อยแล้ว',
          link: '/dashboard',
        });
      }
    } catch (notifErr) {
      console.warn('Failed to notify employee on ticket resolution:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'อัปเดตสถานะ Ticket ใน Google Sheet เรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('PATCH ticket error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการอัปเดต Ticket' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS } from '@/lib/gas';
import { Ticket } from '@/types';

import { getThaiDateStr } from '@/lib/timeSync';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const todayStr = getThaiDateStr();

    const gasRes = await callGAS('getLogs', { logType: 'ticket', limit: 300 });
    const rawTickets = (gasRes?.data || []) as any[];

    // Exclude internal system persistence records (e.g. __SYS_PUSH_SUB__)
    let filtered = rawTickets.filter((t) => !String(t.issueType || '').startsWith('__SYS_'));
    if (session.role !== 'admin' || scope === 'self') {
      filtered = filtered.filter((t) => String(t.employeeId) === String(session.employee_id));
    }

    const normalizeTicketCreatedAt = (rawDateTime: unknown, rawDate: unknown): string => {
      if (rawDateTime && typeof rawDateTime === 'string') {
        const clean = rawDateTime.trim();
        if (clean.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(clean)) {
          return clean.replace(' ', 'T');
        }
        return `${clean.replace(' ', 'T')}+07:00`;
      }
      const datePart = typeof rawDate === 'string' && rawDate.trim() ? rawDate.trim() : todayStr;
      return `${datePart}T09:00:00+07:00`;
    };

    const formatted: Ticket[] = filtered.map((t) => ({
      id: t.uuid || t.ticketId || `${t.employeeId}_${t.date}`,
      employee_id: String(t.employeeId),
      employee_name: t.name || t.employeeName || t.employeeId,
      problem_type: t.issueType || t.type || t.problemType || 'ปัญหาทั่วไป',
      description: t.details || t.description || null,
      status: t.status || 'Pending',
      admin_notes: t.adminNotes || t.notes || null,
      created_at: normalizeTicketCreatedAt(t.dateTime, t.date),
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

    if (!problem_type || typeof problem_type !== 'string' || !problem_type.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุหมวดหมู่ปัญหา' }, { status: 400 });
    }

    if (problem_type.trim().startsWith('__SYS_')) {
      return NextResponse.json({ error: 'หมวดหมู่ปัญหานี้สงวนไว้สำหรับระบบ' }, { status: 400 });
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
      invalidateGasCache('getLogs');
      await createNotificationForAdmins({
        type: 'ticket',
        title: `🎫 มีการแจ้งปัญหาใหม่: ${problem_type}`,
        message: `คุณ ${session.name || session.employee_id} (${session.employee_id}) แจ้ง: "${description || problem_type}"`,
        link: '/admin',
      });
    } catch (notifErr) {
      console.warn('Failed to create ticket notification:', notifErr);
    }

    const createdTicket: Ticket = {
      id: (gasResult as any)?.ticketId || (gasResult as any)?.uuid || `tkt_${Date.now()}`,
      employee_id: String(session.employee_id),
      employee_name: session.name || session.employee_id,
      problem_type,
      description: description || null,
      status: 'Pending',
      admin_notes: null,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'ส่ง Ticket แจ้งปัญหาลง Google Sheet เรียบร้อยแล้ว',
      ticket: createdTicket,
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
    const { ticket_id, status, admin_notes, employee_id } = body;

    const ALLOWED_STATUSES = ['Resolved', 'In Progress', 'Pending', 'Closed', 'ดำเนินการแล้ว', 'กำลังดำเนินการ', 'รอการแก้ไข'];
    if (!ticket_id || typeof ticket_id !== 'string' || !status || typeof status !== 'string' || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'ข้อมูลหรือสถานะ Ticket ไม่ถูกต้อง' }, { status: 400 });
    }

    const { invalidateGasCache } = await import('@/lib/gas');

    const gasResult = await callGAS('resolveTicket', {
      ticketId: ticket_id,
      status: status,
      adminNotes: admin_notes || 'แก้ไขเรียบร้อย',
      adminPin: '9999',
      pin: '9999',
    });

    invalidateGasCache('getLogs');
    invalidateGasCache('getDashboardSummary');

    if (gasResult && !gasResult.success) {
      return NextResponse.json({ error: gasResult.message || 'อัปเดต Ticket ใน Google Sheet ไม่สำเร็จ' }, { status: 400 });
    }

    // Notify employee that their ticket has been resolved
    try {
      const { createNotification } = await import('@/lib/notifications');
      let targetEmpId = employee_id ? String(employee_id) : '';
      if (!targetEmpId) {
        const gasRes = await callGAS('getLogs', { logType: 'ticket', limit: 200 });
        const rawTickets = (gasRes?.data || []) as any[];
        const target = rawTickets.find((t) => t.uuid === ticket_id || t.ticketId === ticket_id || t.id === ticket_id);
        if (target?.employeeId) {
          targetEmpId = String(target.employeeId);
        }
      }
      if (targetEmpId) {
        await createNotification({
          employee_id: targetEmpId,
          type: 'ticket',
          title: '✅ ตั๋วแจ้งปัญหาของคุณได้รับการแก้ไขแล้ว',
          message: admin_notes ? `แอดมินตอบกลับ: "${admin_notes}"` : 'แอดมินได้ตรวจสอบและแก้ไขปัญหาให้เรียบร้อยแล้ว',
          link: '/dashboard',
        });
      }
    } catch (notifErr) {
      console.warn('Failed to notify employee on ticket resolution:', notifErr);
    }

    // Record Audit Log
    try {
      const { createAuditLog } = await import('@/lib/auditStore');
      createAuditLog({
        admin_id: session.employee_id,
        admin_name: session.name,
        action_type: 'RESOLVE_TICKET',
        action_title: 'ตอบกลับ & ดำเนินการ Ticket แจ้งปัญหา',
        details: `${session.name} ปรับสถานะ Ticket (${ticket_id}) เป็น "${status}" ${admin_notes ? `[บันทึกแอดมิน: ${admin_notes}]` : ''}`,
      });
    } catch (auditErr) {
      console.warn('Failed to write ticket audit log:', auditErr);
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

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createNotification, createNotificationForAdmins } from '@/lib/notifications';
import { Ticket } from '@/types';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    let query = supabaseAdmin
      .from('tickets')
      .select(`
        *,
        employees:employee_id ( name, department )
      `)
      .order('created_at', { ascending: false });

    if (session.role === 'employee') {
      query = query.eq('employee_id', session.employee_id);
    }

    const { data, error } = await query;
    if (error) console.error('Fetch tickets error:', error);

    const formatted = (data || []).map((t: any) => ({
      ...t,
      employee_name: t.employees?.name || t.employee_id,
    }));

    return NextResponse.json({ tickets: formatted });
  } catch (error) {
    console.error('GET tickets error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงรายการ Ticket' }, { status: 500 });
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

    const newTicket: Ticket = {
      id: crypto.randomUUID(),
      employee_id: session.employee_id,
      employee_name: session.name,
      problem_type,
      description: description || null,
      status: 'Pending',
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('tickets').insert({
      employee_id: newTicket.employee_id,
      problem_type: newTicket.problem_type,
      description: newTicket.description,
      status: 'Pending',
    });

    if (error) {
      console.error('Create ticket error:', error);
      return NextResponse.json({ error: 'ส่ง Ticket แจ้งปัญหาไม่สำเร็จ' }, { status: 500 });
    }

    // Trigger notification to all admins
    await createNotificationForAdmins({
      type: 'ticket_created',
      title: 'มี Ticket แจ้งปัญหาใหม่',
      message: `มี Ticket ใหม่จาก ${session.name}: ${problem_type}`,
      link: '/admin',
    });

    return NextResponse.json({
      success: true,
      message: 'ส่ง Ticket แจ้งปัญหาให้แอดมินเรียบร้อยแล้ว',
      ticket: newTicket,
    });
  } catch (error) {
    console.error('POST ticket error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้าง Ticket' }, { status: 500 });
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

    const { data: ticketRecord } = await supabaseAdmin
      .from('tickets')
      .select('employee_id')
      .eq('id', ticket_id)
      .maybeSingle();

    const targetEmployeeId = ticketRecord?.employee_id || '';

    const { error } = await supabaseAdmin
      .from('tickets')
      .update({
        status,
        admin_notes: admin_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket_id);

    if (error) {
      console.error('Update ticket error:', error);
      return NextResponse.json({ error: 'อัปเดต Ticket ไม่สำเร็จ' }, { status: 500 });
    }

    // Trigger notification for employee ticket owner
    if (targetEmployeeId) {
      await createNotification({
        employee_id: targetEmployeeId,
        type: 'ticket_updated',
        title: 'อัปเดตสถานะ Ticket แจ้งปัญหา',
        message: `Ticket ของคุณถูกอัปเดตเป็นสถานะ ${status}`,
        link: '/dashboard',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'อัปเดตสถานะ Ticket เรียบร้อยแล้ว',
    });
  } catch (error) {
    console.error('PATCH ticket error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดต Ticket' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendSuspensionAlertEmail } from '@/lib/email';
import { createNotification, createNotificationForAdmins } from '@/lib/notifications';
import { TaskItem } from '@/types';

const createTaskSchema = z.object({
  tasks_assigned: z.number().min(1, 'จำนวนงานต้องมากกว่า 0'),
  tasks_completed: z.number().min(0, 'จำนวนงานสำเร็จต้องไม่ติดลบ'),
  details: z.string().min(1, 'กรุณาระบุรายละเอียดงาน'),
  submission_link: z.string().url('รูปแบบ URL ไม่ถูกต้อง').optional().or(z.literal('')),
});

const rateTaskSchema = z.object({
  task_id: z.string().min(1, 'ไม่ระบุรหัสงาน'),
  star_rating: z.number().min(1).max(5),
  supervisor_note: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    let query = supabaseAdmin
      .from('tasks')
      .select('*, employees!tasks_employee_id_fkey(name, supervisor_id)')
      .order('created_at', { ascending: false });

    if (session.role === 'employee') {
      query = query.eq('employee_id', session.employee_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Fetch tasks error:', error);
    }

    const formatted = (data || []).map((t: any) => ({
      ...t,
      employee_name: t.employees?.name || t.employee_id,
    }));

    return NextResponse.json({ tasks: formatted });
  } catch (error) {
    console.error('GET tasks error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดงาน' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createTaskSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tasks_assigned, tasks_completed, details, submission_link } = validation.data;
    const todayStr = new Date().toISOString().split('T')[0];

    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      submit_date: todayStr,
      employee_id: session.employee_id,
      employee_name: session.name,
      tasks_assigned,
      tasks_completed,
      details,
      submission_link: submission_link || null,
      star_rating: null,
      supervisor_note: null,
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabaseAdmin.from('tasks').insert({
      submit_date: newTask.submit_date,
      employee_id: newTask.employee_id,
      tasks_assigned: newTask.tasks_assigned,
      tasks_completed: newTask.tasks_completed,
      details: newTask.details,
      submission_link: newTask.submission_link,
    });

    if (insertError) {
      console.error('Insert task error:', insertError);
      return NextResponse.json({ error: 'บันทึกงานไม่สำเร็จ' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกและส่งรายงานประจำวันเรียบร้อยแล้ว',
      task: newTask,
    });
  } catch (error) {
    console.error('POST task error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการส่งงาน' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'supervisor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ประเมินผลงาน' }, { status: 403 });
    }

    const body = await request.json();
    const validation = rateTaskSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { task_id, star_rating, supervisor_note } = validation.data;
    const nowIso = new Date().toISOString();

    // 1. Fetch task details to get target employee
    const { data: taskRecord } = await supabaseAdmin
      .from('tasks')
      .select('employee_id, submit_date, star_rating')
      .eq('id', task_id)
      .maybeSingle();

    if (!taskRecord) {
      return NextResponse.json({ error: 'ไม่พบรายการงานที่ต้องการประเมิน' }, { status: 404 });
    }

    // Update task star rating
    await supabaseAdmin
      .from('tasks')
      .update({
        star_rating,
        supervisor_note: supervisor_note || null,
        supervisor_id: session.employee_id,
        rating_date: nowIso,
      })
      .eq('id', task_id);

    // Trigger notification for rated task
    await createNotification({
      employee_id: taskRecord.employee_id,
      type: 'task_rated',
      title: 'ผลงานได้รับการประเมิน',
      message: `รายงานส่งงานของคุณวันที่ ${taskRecord.submit_date} ได้รับการประเมิน ${star_rating} ดาว`,
      link: '/tasks',
    });

    // 2. Handle 1-Star Rating Accumulation & Suspension Threshold
    if (star_rating === 1 && taskRecord.star_rating !== 1) {
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('employee_id, name, email, one_star_count, wfh_status')
        .eq('employee_id', taskRecord.employee_id)
        .maybeSingle();

      if (employee) {
        const newOneStarCount = (employee.one_star_count || 0) + 1;
        const isSuspended = newOneStarCount >= 3;

        await supabaseAdmin
          .from('employees')
          .update({
            one_star_count: newOneStarCount,
            wfh_status: isSuspended ? 'ระงับสิทธิ์' : employee.wfh_status,
            updated_at: nowIso,
          })
          .eq('employee_id', employee.employee_id);

        // If threshold reached (3 stars), automatically create ticket & send notifications
        if (isSuspended) {
          await supabaseAdmin.from('tickets').insert({
            employee_id: employee.employee_id,
            problem_type: 'สะสม 1 ดาวครบ 3 ครั้ง (ระงับสิทธิ์ WFH อัตโนมัติ)',
            description: `พนักงาน ${employee.name} สะสมคะแนน 1 ดาวครบ ${newOneStarCount} ครั้ง ระบบได้ทำการระงับสิทธิ์ WFH อัตโนมัติ`,
            status: 'Pending',
          });

          await sendSuspensionAlertEmail(employee.name, employee.employee_id, employee.email);

          // Notify suspended employee
          await createNotification({
            employee_id: employee.employee_id,
            type: 'suspension',
            title: 'แจ้งเตือนระงับสิทธิ์ WFH',
            message: 'บัญชีของคุณถูกระงับสิทธิ์ WFH เนื่องจากสะสม 1 ดาวครบ 3 ครั้ง',
            link: '/supervisor',
          });

          // Notify all admins
          await createNotificationForAdmins({
            type: 'suspension',
            title: 'แจ้งเตือนระงับสิทธิ์ WFH พนักงาน',
            message: `บัญชีของพนักงาน ${employee.name} (${employee.employee_id}) ถูกระงับสิทธิ์ WFH เนื่องจากสะสม 1 ดาวครบ 3 ครั้ง`,
            link: '/admin',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `ประเมินผลงานเรียบร้อยแล้ว (${star_rating} ดาว)`,
    });
  } catch (error) {
    console.error('PATCH task rating error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการประเมินผลงาน' }, { status: 500 });
  }
}

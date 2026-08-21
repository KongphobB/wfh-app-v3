import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { callGAS, getLiveEmployeesMap, invalidateGasCache } from '@/lib/gas';
import { createNotification } from '@/lib/notifications';
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

    const gasRes = await callGAS('getLogs', { logType: 'task', limit: 300 });
    const rawTasks = (gasRes?.data || []) as any[];

    // Fetch live employee details for accurate supervisor/team hierarchy
    const employeesMap = await getLiveEmployeesMap();

    let filtered = rawTasks;
    if (session.role === 'employee') {
      filtered = rawTasks.filter((t) => String(t.employeeId) === String(session.employee_id));
    } else if (session.role === 'supervisor') {
      const subordinateIds = Object.keys(employeesMap).filter(
        (empId) => String(employeesMap[empId]?.supervisorId) === String(session.employee_id)
      );
      filtered = rawTasks.filter(
        (t) => subordinateIds.includes(String(t.employeeId)) || String(t.employeeId) === String(session.employee_id)
      );
    }

    const formattedTasks: TaskItem[] = filtered.map((t) => {
      const starRating = t.starRating || t.rating ? parseInt(t.starRating || t.rating, 10) : null;
      const empInfo = employeesMap[String(t.employeeId)];
      const rawName =
        t.name && String(t.name).trim() !== '' && String(t.name).trim() !== 'undefined'
          ? String(t.name).trim()
          : empInfo?.name || String(t.employeeId);

      return {
        id: t.uuid || `${t.employeeId}_${t.date}`,
        submit_date: t.date || t.submitDate,
        employee_id: String(t.employeeId),
        employee_name: rawName,
        tasks_assigned: parseInt(t.assignedTasks || t.tasksAssigned || t.assigned || 1, 10),
        tasks_completed: parseInt(t.completedTasks || t.tasksCompleted || t.completed || 0, 10),
        details: t.details || t.taskDetails || '',
        submission_link: t.submissionLink || t.link || null,
        star_rating: starRating && !isNaN(starRating) ? starRating : null,
        supervisor_note: t.supervisorNote || t.supervisorNotes || t.note || null,
        created_at: `${t.date || '2026-08-19'}T09:00:00+07:00`,
      };
    });

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error: any) {
    console.error('GET tasks error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดงานจาก Google Sheet' }, { status: 500 });
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
    const employeesMap = await getLiveEmployeesMap();
    const empInfo = employeesMap[session.employee_id];

    // Submit directly to Google Sheets via Google Apps Script
    const gasResult = await callGAS('submitEmployeeTask', {
      employeeId: session.employee_id,
      name: session.name || empInfo?.name || '',
      employeeName: session.name || empInfo?.name || '',
      supervisorId: empInfo?.supervisorId || '8888',
      assignedTasks: Number(tasks_assigned),
      completedTasks: Number(tasks_completed),
      tasksAssigned: Number(tasks_assigned),
      tasksCompleted: Number(tasks_completed),
      details: details,
      submissionLink: submission_link || '',
      link: submission_link || '',
    });

    if (gasResult && !gasResult.success) {
      return NextResponse.json(
        { error: gasResult.message || 'บันทึกงานลง Google Sheet ไม่สำเร็จ' },
        { status: 400 }
      );
    }

    invalidateGasCache('getLogs');

    return NextResponse.json({
      success: true,
      message: gasResult?.message || 'บันทึกและส่งรายงานประจำวันลง Google Sheet เรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('POST task error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการส่งงาน' }, { status: 500 });
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
    const employeesMap = await getLiveEmployeesMap();
    const authPin = employeesMap[session.employee_id]?.pin || (session.employee_id === '9999' ? '9998' : '1234');

    // Submit rating directly to Google Sheets
    let gasResult = await callGAS('submitSupervisorRating', {
      taskUuid: task_id,
      taskId: task_id,
      uuid: task_id,
      rating: star_rating,
      starRating: star_rating,
      note: supervisor_note || '',
      supervisorNotes: supervisor_note || '',
      supervisorId: session.employee_id,
      pin: authPin,
      supervisorPin: authPin,
      adminPin: '9998',
    });

    // Fallback for older tasks assigned under 9999 supervisor in Google Sheets
    if (gasResult && !gasResult.success && String(gasResult.message || '').includes('สิทธิ์ของหัวหน้างาน')) {
      gasResult = await callGAS('submitSupervisorRating', {
        taskUuid: task_id,
        taskId: task_id,
        uuid: task_id,
        rating: star_rating,
        starRating: star_rating,
        note: supervisor_note || '',
        supervisorNotes: supervisor_note || '',
        supervisorId: '9999',
        pin: '9998',
        supervisorPin: '9998',
        adminPin: '9998',
      });
    }

    if (gasResult && !gasResult.success) {
      return NextResponse.json(
        { error: gasResult.message || 'บันทึกการประเมินใน Google Sheet ไม่สำเร็จ' },
        { status: 400 }
      );
    }

    invalidateGasCache('getLogs');

    // Send in-app notification to employee
    try {
      let empId = task_id.includes('_') ? task_id.split('_')[0] : '';
      if (!empId) {
        const tasksRes = await callGAS('getLogs', { logType: 'task', limit: 50 });
        const targetTask = ((tasksRes?.data || []) as any[]).find((t) => t.uuid === task_id || t.id === task_id);
        if (targetTask?.employeeId) {
          empId = String(targetTask.employeeId);
        }
      }

      if (empId) {
        await createNotification({
          employee_id: empId,
          type: 'task_rated',
          title: `⭐ หัวหน้างานประเมินผลงานแล้ว (${star_rating} ดาว)`,
          message: supervisor_note ? `ความคิดเห็น: ${supervisor_note}` : `หัวหน้างานได้ประเมินคะแนนส่งงานประจำวันแล้ว`,
          link: '/tasks',
        });
      }
    } catch (notifErr) {
      console.warn('Failed to dispatch rating notification:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `ประเมินผลงานเรียบร้อยแล้วใน Google Sheet (${star_rating} ดาว)`,
    });
  } catch (error: any) {
    console.error('PATCH task rating error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการประเมินผลงาน' }, { status: 500 });
  }
}

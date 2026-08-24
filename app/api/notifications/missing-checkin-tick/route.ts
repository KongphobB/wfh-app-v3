import { NextResponse } from 'next/server';
import { callGAS, getLiveEmployeesMap } from '@/lib/gas';
import { verifyCronAuth } from '@/lib/cron';
import { createNotification } from '@/lib/notifications';
import { sendEmailAlert } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const employeesMap = await getLiveEmployeesMap();
    const checkinRes = await callGAS('getLogs', { logType: 'checkin', limit: 200 });
    const checkinLogs = (checkinRes?.data || []) as any[];

    // Set of employee IDs who have checked in today
    const checkedInEmpIds = new Set(
      checkinLogs
        .filter((c) => c.date === todayStr && (c.type === 'เข้างาน' || c.log_type === 'เข้างาน'))
        .map((c) => String(c.employeeId || c.employee_id))
    );

    const notifiedEmployees: { id: string; name: string; email?: string }[] = [];

    for (const [empId, emp] of Object.entries(employeesMap)) {
      if (!checkedInEmpIds.has(empId) && empId !== '9999') {
        notifiedEmployees.push({
          id: empId,
          name: emp.name || empId,
          email: emp.email,
        });

        // 1. In-app notification to employee
        await createNotification({
          employee_id: empId,
          type: 'warning',
          title: '⚠️ ยังไม่ได้ลงเวลาเข้างานช่วงเช้า (หลัง 08:00 น.)',
          message: 'ระบบตรวจพบว่าคุณยังไม่ได้ลงเวลาเข้างานช่วงเช้า กรุณาลงเวลาและระบุเหตุผลความจำเป็นในช่องหมายเหตุ',
          link: '/checkin',
        });

        // 2. Email alert to employee if email is available
        if (emp.email && emp.email.includes('@')) {
          await sendEmailAlert({
            to: emp.email,
            subject: `[SNU WFH] แจ้งเตือน: ยังไม่ได้ลงเวลาเข้างานช่วงเช้า (หลัง 08:00 น.)`,
            bodyHtml: `
              <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b; border-radius: 8px;">
                <h3 style="color: #ea580c;">⚠️ แจ้งเตือนการลงเวลาเข้างานช่วงเช้า (SNU WFH)</h3>
                <p>เรียน คุณ <strong>${emp.name}</strong> (รหัสพนักงาน: ${empId}),</p>
                <p>ขณะนี้เลยเวลา <strong>08:00 น.</strong> แล้ว ระบบตรวจพบว่าคุณยังไม่ได้ลงเวลาปฏิบัติงานช่วงเช้า</p>
                <p>กรุณาเข้าสู่ระบบ <a href="https://wfh-system-v3.vercel.app/checkin" style="color: #ea580c; font-weight: bold;">คลิกที่นี่เพื่อลงเวลาเข้างาน</a> พร้อมระบุเหตุผลการเข้างานสายในช่องหมายเหตุ</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
                <p style="font-size: 12px; color: #64748b;">ข้อความนี้เป็นระบบอัตโนมัติจาก SNU Supply & Service WFH System</p>
              </div>
            `,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      time: '08:00',
      notifiedCount: notifiedEmployees.length,
      notifiedEmployees,
    });
  } catch (error: any) {
    console.error('Missing checkin tick error:', error);
    return NextResponse.json({ error: error?.message || 'Tick failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, determineRole, formatPositionForRole } from '@/lib/auth';
import { callGAS } from '@/lib/gas';
import { Employee, WfhStatus } from '@/types';
import { getExemptConfig } from '@/lib/photoExempt';
import { createAuditLog } from '@/lib/auditStore';
import { getDailyWorkLocation, setDailyWorkLocation, getDailyLocationRecord } from '@/lib/dailyLocationStore';
import { resolveEmployeeDailyStatus } from '@/lib/dailyStatus';
import { getEmployeeWeeklySchedule, setEmployeeWeeklySchedule } from '@/lib/scheduleStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
      return NextResponse.json({ error: 'เฉพาะแอดมินหรือหัวหน้างานเท่านั้น' }, { status: 403 });
    }

    const { exemptKeywords, exemptEmployeeIds, autoExemptSupervisors } = await getExemptConfig();

    const checkExempt = (empId: string, pos?: string | null, role?: string) => {
      if (empId && exemptEmployeeIds.has(empId)) return true;
      if (autoExemptSupervisors && (role === 'admin' || role === 'supervisor')) return true;
      const lowerPos = String(pos || '').toLowerCase();
      if (lowerPos && exemptKeywords.some((keyword: string) => lowerPos.includes(keyword))) return true;
      return false;
    };

    // 1. Fetch live Google Sheet rows directly from 'ข้อมูลพนักงาน'
    const inspectRes = await callGAS('inspectTab', { sheetName: 'ข้อมูลพนักงาน' });
    const targetRows = inspectRes?.targetRows || [];

    if (Array.isArray(targetRows) && targetRows.length > 1) {
      const dataRows = targetRows.slice(1);

      const employeesList: Employee[] = dataRows
        .filter((r) => r && r[0] != null && String(r[0]).trim() !== '')
        .map((r) => {
          const empId = String(r[0]).trim();
          const name = r[1] ? String(r[1]).trim() : empId;
          const email = r[2] ? String(r[2]).trim() : null;
          const dept = r[3] ? String(r[3]).trim() : null;
          const position = r[4] ? String(r[4]).trim() : null;
          const supervisorId = r[5] && String(r[5]).trim() !== '' ? String(r[5]).trim() : null;
          const oneStarCount = parseInt(r[7] || 0, 10);
          const wfhStatus: WfhStatus = r[8] === 'ระงับสิทธิ์' ? 'ระงับสิทธิ์' : 'เปิดสิทธิ์';
          const role = determineRole(position || undefined, dept || undefined, empId);

          const dailyDetail = resolveEmployeeDailyStatus(empId);
          const locRecord = getDailyLocationRecord(empId);

          return {
            employee_id: empId,
            name: name,
            email: email,
            department: dept,
            position: position,
            supervisor_id: supervisorId,
            role: role,
            wfh_status: wfhStatus,
            one_star_count: isNaN(oneStarCount) ? 0 : oneStarCount,
            is_photo_exempt: checkExempt(empId, position, role),
            work_location_today: dailyDetail.location,
            resolved_daily_status: dailyDetail.status,
            daily_status_reason: locRecord?.reason || dailyDetail.reason,
            is_auto_gps_location: Boolean(locRecord?.is_auto_gps),
            wfh_weekly_days: getEmployeeWeeklySchedule(empId),
            force_pin_change: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });

      const finalEmployees = session.role === 'supervisor'
        ? employeesList.filter((e) => String(e.supervisor_id) === String(session.employee_id))
        : employeesList;

      return NextResponse.json(
        { employees: finalEmployees },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // 2. Fallback to getLiveEmployeesMap / getSystemConfig
    const { getLiveEmployeesMap } = await import('@/lib/gas');
    const employeesMap = await getLiveEmployeesMap();

    const employeesList: Employee[] = Object.keys(employeesMap).map((empId) => {
      const e = employeesMap[empId];
      const role = determineRole(e.position, e.dept, empId);
      const dailyDetail = resolveEmployeeDailyStatus(String(empId));
      const locRecord = getDailyLocationRecord(String(empId));

      return {
        employee_id: String(empId),
        name: e.name || empId,
        email: e.email || null,
        department: e.dept || null,
        position: e.position || null,
        supervisor_id: e.supervisorId ? String(e.supervisorId) : null,
        role: role,
        wfh_status: (e as any).wfhStatus || 'เปิดสิทธิ์',
        one_star_count: (e as any).oneStarCount || 0,
        is_photo_exempt: checkExempt(String(empId), e.position, role),
        work_location_today: dailyDetail.location,
        resolved_daily_status: dailyDetail.status,
        daily_status_reason: locRecord?.reason || dailyDetail.reason,
        is_auto_gps_location: Boolean(locRecord?.is_auto_gps),
        wfh_weekly_days: getEmployeeWeeklySchedule(String(empId)),
        force_pin_change: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const finalEmployees = session.role === 'supervisor'
      ? employeesList.filter((e) => String(e.supervisor_id) === String(session.employee_id))
      : employeesList;

    return NextResponse.json(
      { employees: finalEmployees },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('GET admin employees error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลพนักงานจาก Google Sheet' }, { status: 500 });
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
    const finalPosition = formatPositionForRole(newEmpData.position || 'พนักงาน', newEmpData.role);

    const gasResult = await callGAS('adminAddNewEmployee', {
      employeeId: newEmpData.employee_id,
      name: newEmpData.name,
      email: newEmpData.email || '',
      dept: newEmpData.department || 'ทั่วไป',
      position: finalPosition,
      supervisorId: newEmpData.supervisor_id || '9999',
      pin: '1234',
      adminPin: '9999',
    });

    if (gasResult && !gasResult.success) {
      return NextResponse.json({ error: gasResult.message || 'บันทึกข้อมูลพนักงานลง Google Sheet ไม่สำเร็จ' }, { status: 400 });
    }

    createAuditLog({
      admin_id: session.employee_id,
      admin_name: session.name,
      action_type: 'CREATE_EMPLOYEE',
      action_title: 'สร้างพนักงานใหม่',
      target_employee_id: newEmpData.employee_id,
      target_employee_name: newEmpData.name,
      details: `${session.name} สร้างพนักงานใหม่: ${newEmpData.name} (${newEmpData.employee_id}) แผนก: ${newEmpData.department || 'ทั่วไป'} บทบาท: ${newEmpData.role}`,
    });

    return NextResponse.json({
      success: true,
      message: `สร้างพนักงาน ${newEmpData.name} สำเร็จใน Google Sheet (PIN เริ่มต้น: 1234)`,
    });
  } catch (error: any) {
    console.error('POST employee error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการสร้างพนักงาน' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
      return NextResponse.json({ error: 'เฉพาะแอดมินหรือหัวหน้างานเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();
    const { employee_id, action, name, email, wfh_status, reset_pin, supervisor_id, department, position, role, work_location } = body;

    if (!employee_id) {
      return NextResponse.json({ error: 'ไม่ระบุรหัสพนักงาน' }, { status: 400 });
    }

    // 0. If action is updating daily work location (Office vs WFH)
    if (action === 'update_work_location' || work_location) {
      const location = (work_location || body.location) === 'office' ? 'office' : 'wfh';
      const record = setDailyWorkLocation(employee_id, location, name || employee_id, session.name);

      createAuditLog({
        admin_id: session.employee_id,
        admin_name: session.name,
        action_type: location === 'office' ? 'SET_OFFICE_MODE' : 'SET_WFH_MODE',
        action_title: location === 'office' ? 'กำหนดเข้า Office วันนี้' : 'กำหนดทำงาน WFH วันนี้',
        target_employee_id: employee_id,
        target_employee_name: name || employee_id,
        details: `${session.name} กำหนดสถานที่ทำงานของพนักงาน ${name || employee_id} (${employee_id}) วันนี้เป็น "${location === 'office' ? 'เข้า Office' : 'ทำงาน WFH'}"`,
      });

      // Sync to Google Sheet checkin log in background if setting to office
      if (location === 'office') {
        callGAS('checkin', {
          type: 'เข้างาน',
          employeeId: employee_id,
          lat: 12.736929,
          lng: 101.114387,
          note: 'ปฏิบัติงานที่ออฟฟิศ (แอดมินกำหนด)',
        }).catch((err) => console.warn('Background GAS office log error:', err));
      }

      return NextResponse.json({
        success: true,
        employee_id,
        work_location: location,
        message: `ปรับสถานที่ทำงานของพนักงาน ${name || employee_id} วันนี้เป็น ${location === 'office' ? '🏢 เข้า Office' : '🏡 ทำงาน WFH'} สำเร็จ`,
      });
    }

    // 0.1 If action is updating recurring weekly WFH schedule preset
    if (action === 'update_weekly_schedule') {
      const days = Array.isArray(body.days) ? body.days : [];
      const updatedDays = setEmployeeWeeklySchedule(employee_id, days);

      const dayNamesMap: Record<number, string> = { 1: 'จ.', 2: 'อ.', 3: 'พ.', 4: 'พฤ.', 5: 'ศ.' };
      const formattedDays = updatedDays.length > 0
        ? updatedDays.map((d) => dayNamesMap[d] || String(d)).join(', ')
        : 'ไม่มี (เข้า Office ทุกวัน)';

      createAuditLog({
        admin_id: session.employee_id,
        admin_name: session.name,
        action_type: 'EDIT_EMPLOYEE',
        action_title: 'ตั้งตาราง WFH ประจำสัปดาห์',
        target_employee_id: employee_id,
        target_employee_name: name || employee_id,
        details: `${session.name} กำหนดตาราง WFH ประจำสัปดาห์ของ ${name || employee_id} (${employee_id}) เป็น: [${formattedDays}]`,
      });

      return NextResponse.json({
        success: true,
        employee_id,
        wfh_weekly_days: updatedDays,
        message: `บันทึกตาราง WFH ประจำสัปดาห์ของ ${name || employee_id} สำเร็จ: ${formattedDays}`,
      });
    }

    // Only full admin can do other sensitive employee operations
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const { getLiveEmployeesMap, invalidateGasCache } = await import('@/lib/gas');

    // 1. If action is updating WFH status specifically
    if (action === 'update_wfh' || (wfh_status && !name && !department && !position)) {
      const gasResult = await callGAS('adminBulkUpdateWfhStatus', {
        targetEmployeeIds: [employee_id],
        employeeId: employee_id,
        wfhStatus: wfh_status,
        status: wfh_status,
        adminPin: '9999',
      });

      invalidateGasCache();

      if (gasResult && !gasResult.success) {
        return NextResponse.json({ error: gasResult.message || 'ปรับสิทธิ์ WFH ไม่สำเร็จ' }, { status: 400 });
      }

      createAuditLog({
        admin_id: session.employee_id,
        admin_name: session.name,
        action_type: wfh_status === 'เปิดสิทธิ์' ? 'UNSUSPEND_WFH' : 'SUSPEND_WFH',
        action_title: wfh_status === 'เปิดสิทธิ์' ? 'ปลดระงับสิทธิ์ WFH' : 'ระงับสิทธิ์ WFH',
        target_employee_id: employee_id,
        details: `${session.name} ปรับสิทธิ์ WFH ของพนักงาน ${employee_id} เป็น "${wfh_status}"`,
      });

      return NextResponse.json({
        success: true,
        message: gasResult?.message || `ปรับสิทธิ์ WFH ของพนักงาน ${employee_id} เป็น ${wfh_status} สำเร็จ`,
      });
    }

    // 2. Full employee info update or reset pin
    const empsMap = await getLiveEmployeesMap();
    const currentEmp = empsMap[employee_id] || { name: employee_id, email: '', dept: '', position: '', supervisorId: '' };

    const finalName = name || currentEmp.name || employee_id;
    const finalEmail = email !== undefined ? email : (currentEmp.email || '');
    const finalDept = department !== undefined ? department : (currentEmp.dept || '');
    let finalPosition = position !== undefined ? position : (currentEmp.position || '');
    if (role) {
      finalPosition = formatPositionForRole(finalPosition || 'พนักงาน', role);
    }
    const finalSupervisorId = supervisor_id !== undefined ? supervisor_id : (currentEmp.supervisorId || '');

    const gasResult = await callGAS('adminUpdateEmployeeInfo', {
      targetEmployeeId: employee_id,
      employeeId: employee_id,
      name: finalName,
      email: finalEmail,
      dept: finalDept,
      position: finalPosition,
      supervisorId: finalSupervisorId,
      wfhStatus: wfh_status || undefined,
      resetPin: reset_pin === true,
      oneStarCount: action === 'clear_stars' ? 0 : undefined,
      clearStars: action === 'clear_stars',
      adminPin: '9999',
    });

    invalidateGasCache();

    if (gasResult && !gasResult.success) {
      return NextResponse.json({ error: gasResult.message || 'แก้ไขข้อมูลใน Google Sheet ไม่สำเร็จ' }, { status: 400 });
    }

    createAuditLog({
      admin_id: session.employee_id,
      admin_name: session.name,
      action_type: 'EDIT_EMPLOYEE',
      action_title: reset_pin ? 'รีเซ็ต PIN & แก้ไขข้อมูลพนักงาน' : 'แก้ไขข้อมูลพนักงาน',
      target_employee_id: employee_id,
      target_employee_name: finalName,
      details: `${session.name} แก้ไขข้อมูลพนักงาน ${finalName} (${employee_id}) แผนก: ${finalDept}, ตำแหน่ง: ${finalPosition}${reset_pin ? ' [รีเซ็ต PIN เป็น 1234]' : ''}`,
    });

    return NextResponse.json({
      success: true,
      message: 'อัปเดตข้อมูลพนักงานเรียบร้อยแล้วใน Google Sheet',
    });
  } catch (error: any) {
    console.error('PATCH employee error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการอัปเดตพนักงาน' }, { status: 500 });
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

    if (employee_id === '9999') {
      return NextResponse.json({ error: 'ไม่สามารถลบผู้ดูแลระบบหลักได้' }, { status: 400 });
    }

    const gasResult = await callGAS('adminDeleteEmployee', {
      targetEmployeeId: employee_id,
      adminPin: '9999',
    });

    if (gasResult && !gasResult.success) {
      return NextResponse.json({ error: gasResult.message || 'ลบข้อมูลพนักงานใน Google Sheet ไม่สำเร็จ' }, { status: 400 });
    }

    createAuditLog({
      admin_id: session.employee_id,
      admin_name: session.name,
      action_type: 'EDIT_EMPLOYEE',
      action_title: 'ลบข้อมูลพนักงาน',
      target_employee_id: employee_id,
      details: `${session.name} ลบพนักงานรหัส ${employee_id} ออกจากระบบ`,
    });

    return NextResponse.json({
      success: true,
      message: gasResult?.message || `ลบพนักงาน ${employee_id} สำเร็จใน Google Sheet`,
    });
  } catch (error: any) {
    console.error('DELETE employee error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการลบพนักงาน' }, { status: 500 });
  }
}

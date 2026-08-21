import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, determineRole, formatPositionForRole } from '@/lib/auth';
import { callGAS } from '@/lib/gas';
import { Employee, WfhStatus } from '@/types';
import { getExemptConfig } from '@/lib/photoExempt';

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
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
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
            force_pin_change: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });

      return NextResponse.json({ employees: employeesList });
    }

    // 2. Fallback to getSystemConfig
    const configRes = await callGAS('getSystemConfig');
    const employeesMap = configRes?.config?.employeesMap || {};

    const employeesList: Employee[] = Object.keys(employeesMap).map((empId) => {
      const e = employeesMap[empId];
      const role = determineRole(e.position, e.dept, empId);

      return {
        employee_id: String(empId),
        name: e.name || empId,
        email: e.email || null,
        department: e.dept || null,
        position: e.position || null,
        supervisor_id: e.supervisorId ? String(e.supervisorId) : null,
        role: role,
        wfh_status: e.wfhStatus || 'เปิดสิทธิ์',
        one_star_count: e.oneStarCount || 0,
        is_photo_exempt: checkExempt(String(empId), e.position, role),
        force_pin_change: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    return NextResponse.json({ employees: employeesList });
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
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();
    const { employee_id, action, name, email, wfh_status, reset_pin, supervisor_id, department, position, role } = body;

    if (!employee_id) {
      return NextResponse.json({ error: 'ไม่ระบุรหัสพนักงาน' }, { status: 400 });
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

    return NextResponse.json({
      success: true,
      message: gasResult?.message || `ลบพนักงาน ${employee_id} สำเร็จใน Google Sheet`,
    });
  } catch (error: any) {
    console.error('DELETE employee error:', error);
    return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการลบพนักงาน' }, { status: 500 });
  }
}

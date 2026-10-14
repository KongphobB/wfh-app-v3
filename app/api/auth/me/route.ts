import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      employee_id: session.employee_id,
      name: session.name,
      role: session.role,
      department: session.department,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unauthorized' }, { status: 401 });
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllAuditLogs } from '@/lib/auditStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
      return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบหรือหัวหน้างานเท่านั้น' }, { status: 403 });
    }

    const logs = getAllAuditLogs();

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length,
    });
  } catch (error: any) {
    console.error('GET audit logs error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}

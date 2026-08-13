import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('employee_id', session.employee_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Fetch notifications error:', error);
    }

    const notifications = data || [];
    const unreadCount = notifications.filter((n: any) => !n.is_read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('GET notifications error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงการแจ้งเตือน' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_id, mark_all } = body;

    if (mark_all) {
      await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('employee_id', session.employee_id);
    } else if (notification_id) {
      await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification_id)
        .eq('employee_id', session.employee_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH notifications error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตการแจ้งเตือน' }, { status: 500 });
  }
}

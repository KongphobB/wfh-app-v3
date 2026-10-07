import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { savePushSubscriptionAsync } from '@/lib/pushStore';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'ข้อมูล Subscription ไม่ถูกต้อง' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || undefined;

    const saved = await savePushSubscriptionAsync(session.employee_id, subscription, userAgent);

    return NextResponse.json({
      success: true,
      message: 'ลงทะเบียนรับการแจ้งเตือน Web Push สำเร็จ',
      subscriptionId: saved.id,
    });
  } catch (error: any) {
    console.error('Push subscribe error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึก Push Subscription' },
      { status: 500 }
    );
  }
}

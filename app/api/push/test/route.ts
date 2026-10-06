import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sendPushToEmployee } from '@/lib/webPush';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const result = await sendPushToEmployee(session.employee_id, {
      title: '🔔 ทดสอบระบบ Web Push (PWA)',
      body: 'ระบบสามารถส่งสัญญาณแจ้งเตือนทะลุเข้าโทรศัพท์ของคุณได้สำเร็จ แม้จะปิดแอปไปแล้ว!',
      url: '/dashboard',
      tag: `test_push_${Date.now()}`,
      vibrate: [300, 150, 300, 150, 400],
      requireInteraction: true,
    });

    if (result.sent === 0) {
      return NextResponse.json({
        success: false,
        message: 'ยังไม่พบอุปกรณ์ที่ลงทะเบียนรับ Push (กรุณากดเปิดอนุญาตการแจ้งเตือนในหน้าระบบก่อน)',
      });
    }

    return NextResponse.json({
      success: true,
      message: `ส่งการแจ้งเตือนสำเร็จไปยัง ${result.sent} อุปกรณ์`,
      ...result,
    });
  } catch (error: any) {
    console.error('Test push error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่ง Test Push' },
      { status: 500 }
    );
  }
}

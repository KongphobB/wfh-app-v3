import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin.from('app_config').select('*');
    if (error) console.error('Fetch config error:', error);
    return NextResponse.json({ configs: data || [] });
  } catch (error) {
    console.error('GET config error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงการตั้งค่า' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้น' }, { status: 403 });
    }

    const body = await request.json();
    const { configs } = body; // Record<string, string>

    if (!configs || typeof configs !== 'object') {
      return NextResponse.json({ error: 'รูปแบบข้อมูลการตั้งค่าไม่ถูกต้อง' }, { status: 400 });
    }

    const upsertRows = Object.entries(configs).map(([key, value]) => ({
      key,
      value: String(value),
    }));

    const { error } = await supabaseAdmin.from('app_config').upsert(upsertRows);
    if (error) {
      console.error('Upsert config error:', error);
      return NextResponse.json({ error: 'บันทึกการตั้งค่าไม่สำเร็จ' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว',
    });
  } catch (error) {
    console.error('POST config error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' }, { status: 500 });
  }
}

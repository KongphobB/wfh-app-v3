import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
  }

  const employeeId = session.employee_id;
  const encoder = new TextEncoder();

  let intervalId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Function to check DB & push notification update
      const checkAndPush = async () => {
        try {
          const { data: unreadData } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('is_read', false);

          const unreadCount = unreadData?.length || 0;

          const { data: latestData } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false })
            .limit(1);

          const latestNotification = latestData && latestData.length > 0 ? latestData[0] : null;

          const payload = JSON.stringify({
            unreadCount,
            latestNotification,
            timestamp: Date.now(),
          });

          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch (err) {
          console.error('SSE Stream push error:', err);
        }
      };

      // Push initial state immediately
      await checkAndPush();

      // Poll DB every 4 seconds (server-side only)
      intervalId = setInterval(async () => {
        await checkAndPush();
      }, 4000);
    },
    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

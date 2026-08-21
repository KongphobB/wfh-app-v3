import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getNotificationsForUser } from '@/lib/notifications';

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
      const checkAndPush = () => {
        try {
          const notifs = getNotificationsForUser(employeeId);
          const unreadCount = notifs.filter((n: any) => !n.is_read).length;
          const latestNotification = notifs.length > 0 ? notifs[0] : null;

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

      checkAndPush();

      intervalId = setInterval(() => {
        checkAndPush();
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

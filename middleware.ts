import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets & internal cron routes bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/spotcheck/tick') ||
    pathname.startsWith('/api/notifications/missing-checkin-tick')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('wfh_session')?.value;
  let session: any = null;

  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        session = JSON.parse(payloadStr);
      }
    } catch {
      session = null;
    }
  }

  // Unauthenticated user attempting to access protected pages
  if (!session) {
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // User is authenticated but on /login -> redirect to home role dashboard
  if (pathname === '/login') {
    const target =
      session.force_pin_change
        ? '/change-pin'
        : session.role === 'admin'
        ? '/admin'
        : session.role === 'supervisor'
        ? '/supervisor'
        : '/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Force PIN change check
  if (session.force_pin_change && pathname !== '/change-pin' && !pathname.startsWith('/api/auth')) {
    return NextResponse.redirect(new URL('/change-pin', request.url));
  }

  // Admin route protection
  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Supervisor route protection
  if (pathname.startsWith('/supervisor') && session.role !== 'supervisor' && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

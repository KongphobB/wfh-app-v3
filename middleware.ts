import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Immediate bypass for all API routes & static assets
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('wfh_session');
  const token = cookie ? cookie.value : null;
  const session = token ? parseJwtPayload(token) : null;

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
  if (session.force_pin_change && pathname !== '/change-pin') {
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

export default middleware;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

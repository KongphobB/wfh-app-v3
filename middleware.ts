import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // All API routes, static assets, and auth endpoints bypass middleware
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('wfh_session');
  const token = cookie ? cookie.value : null;
  const session = token ? parseJwt(token) : null;

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

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

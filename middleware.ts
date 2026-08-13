import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('wfh_session')?.value;
  let session: any = null;

  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        session = JSON.parse(atob(parts[1]));
      }
    } catch {
      session = null;
    }
  }

  if (!session) {
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

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

  if (session.force_pin_change && pathname !== '/change-pin') {
    return NextResponse.redirect(new URL('/change-pin', request.url));
  }

  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname.startsWith('/supervisor') && session.role !== 'supervisor' && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;

    // Direct bypass for API routes & static assets
    if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
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
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('wfh_session')?.value;
  let session: any = null;

  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
          base64 += '=';
        }
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const jsonStr = new TextDecoder().decode(bytes);
        session = JSON.parse(jsonStr);
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
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/spotcheck/tick|api/notifications/missing-checkin-tick|api/auth/login).*)',
  ],
};

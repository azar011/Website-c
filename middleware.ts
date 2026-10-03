import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'quiz_super_secure_jwt_secret_key_antigravity_2025'
);

function addNoCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes (except /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('admin_session_token')?.value;

    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      return addNoCacheHeaders(response);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const role = (payload as any)?.role || 'ADMIN';

      // Security Isolation: Master Admin vs Standard User Admin
      // 1. If Master Admin visits standard /admin dashboard, redirect to /admin/users
      if (pathname === '/admin' && role === 'SUPER_ADMIN') {
        const response = NextResponse.redirect(new URL('/admin/users', request.url));
        return addNoCacheHeaders(response);
      }

      // 2. If Standard Admin attempts to access /admin/users, redirect to /admin
      if (pathname.startsWith('/admin/users') && role !== 'SUPER_ADMIN') {
        const response = NextResponse.redirect(new URL('/admin', request.url));
        return addNoCacheHeaders(response);
      }

      const response = NextResponse.next();
      return addNoCacheHeaders(response);
    } catch {
      // Invalid/expired token -> clear and redirect to login
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('admin_session_token');
      return addNoCacheHeaders(response);
    }
  }

  // If already logged in and visiting /admin/login or /login, redirect directly according to role
  if (pathname === '/admin/login' || pathname === '/login') {
    const token = request.cookies.get('admin_session_token')?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const role = (payload as any)?.role || 'ADMIN';
        const target = role === 'SUPER_ADMIN' ? '/admin/users' : '/admin';
        const response = NextResponse.redirect(new URL(target, request.url));
        return addNoCacheHeaders(response);
      } catch {
        // Token invalid, allow login page to render
      }
    }
    const response = NextResponse.next();
    return addNoCacheHeaders(response);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};

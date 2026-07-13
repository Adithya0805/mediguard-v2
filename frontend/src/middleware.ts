import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Define protected paths
  const protectedPaths = ['/dashboard', '/patient', '/report', '/sessions', '/admin'];
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  
  const token = request.cookies.get('mediguard_clinical_token')?.value;
  
  // If requesting a protected route without a valid token, redirect to login
  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If logged in and hitting login page, redirect to dashboard
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

// Config to specify matching route paths
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/patient/:path*',
    '/report/:path*',
    '/sessions/:path*',
    '/admin/:path*',
    '/login'
  ]
};

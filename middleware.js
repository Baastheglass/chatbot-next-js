import { NextResponse, userAgent } from 'next/server'
import jwt from 'jsonwebtoken'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicPaths = ['/login', '/signup', '/api/auth/login', '/api/auth/signup']
  
  // Check if the current path is public
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check for auth token
  const token = request.cookies.get('auth-token')

  // If no token and trying to access protected route, redirect to login
  if (!token && (pathname.startsWith('/chat') || pathname === '/')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify token for API routes (except auth routes)
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) {
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    try {
      jwt.verify(token.value, process.env.JWT_SECRET)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
  }

  const useragent= userAgent(request)
  const response = NextResponse.rewrite(request.nextUrl);
  response.cookies.set("user-agent", useragent.ua, { path: "/" });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
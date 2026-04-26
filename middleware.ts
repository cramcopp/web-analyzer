import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * SEC-10: CSRF Protection Middleware
 * Intercepts state-changing requests to ensure they originate from our own domain.
 */
export function middleware(request: NextRequest) {
  const { method, nextUrl } = request;
  const pathname = nextUrl.pathname;

  // 1. Only protect API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 2. Allow safe methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return NextResponse.next();
  }

  // 3. Exclude specific endpoints that are designed for cross-origin access (with their own auth)
  const excludedEndpoints = [
    '/api/stripe/webhook',
    '/api/cron/monitor'
  ];

  if (excludedEndpoints.some(endpoint => pathname.startsWith(endpoint))) {
    return NextResponse.next();
  }

  // 4. CSRF Check: Verify Origin and Referer
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const appUrl = process.env.APP_URL || '';
  
  // In development, we might use localhost
  const isDevelopment = process.env.NODE_ENV === 'development';
  const trustedOrigins = [appUrl];
  if (isDevelopment) {
    trustedOrigins.push('http://localhost:3000');
  }

  // Check if Origin matches any of our trusted origins
  const isOriginTrusted = origin && trustedOrigins.some(trusted => origin.startsWith(trusted));
  
  // If Origin is missing (sometimes happens in certain browsers/proxies), fallback to Referer
  const isRefererTrusted = !origin && referer && trustedOrigins.some(trusted => referer.startsWith(trusted));

  if (!isOriginTrusted && !isRefererTrusted) {
    console.warn(`CSRF Blocked: Method=${method} Path=${pathname} Origin=${origin} Referer=${referer}`);
    return NextResponse.json(
      { error: 'CSRF Protection: Invalid Origin' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/api/:path*',
};

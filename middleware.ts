import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { method, nextUrl } = request;
  const pathname = nextUrl.pathname;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return NextResponse.next();
  }

  const excludedEndpoints = [
    '/api/stripe/webhook',
    '/api/cron/monitor',
  ];

  if (excludedEndpoints.some((endpoint) => pathname.startsWith(endpoint))) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const appUrl = `${nextUrl.protocol}//${nextUrl.host}`;

  const trustedOrigins = [appUrl];
  if (process.env.NODE_ENV === 'development') {
    trustedOrigins.push('http://localhost:3000');
  }

  const isOriginTrusted = origin && trustedOrigins.some((trusted) => origin.startsWith(trusted));
  const isRefererTrusted = !origin && referer && trustedOrigins.some((trusted) => referer.startsWith(trusted));

  if (!isOriginTrusted && !isRefererTrusted) {
    console.warn(`CSRF Blocked: Method=${method} Path=${pathname} Origin=${origin} Referer=${referer}`);
    return NextResponse.json(
      { error: 'CSRF Protection: Invalid Origin' },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

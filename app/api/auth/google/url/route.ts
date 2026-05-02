import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const env = getRuntimeEnv();
  const origin = new URL(req.url).origin;
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes
    path: '/'
  });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID || '',
    redirect_uri: env.GOOGLE_REDIRECT_URI || `${env.APP_URL || origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/webmasters.readonly',
    access_type: 'offline',
    prompt: 'consent select_account',

    state: state
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.json({ url });
}

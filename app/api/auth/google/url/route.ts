import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/webmasters.readonly',
    access_type: 'offline',
    prompt: 'select_account',
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.json({ url });
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchWithRetry } from '@/lib/http';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const env = getRuntimeEnv();
    const cookieStore = await cookies();
    const token = cookieStore.get('wap_session')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verify token with Firebase REST API (Edge compatible)
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });

    if (!response.ok) {
      // Token might be expired
      cookieStore.delete('wap_session');
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const data = await response.json();
    const firebaseUser = data.users?.[0];

    if (!firebaseUser) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        uid: firebaseUser.localId,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoUrl,
        emailVerified: firebaseUser.emailVerified
      }
    });

  } catch (error) {
    console.error('Session Verification Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ authenticated: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchWithRetry } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const env = getRuntimeEnv();
  const origin = new URL(req.url).origin;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const storedState = cookieStore.get('oauth_state')?.value;
  
  // SEC-07: CSRF Protection
  if (!state || !storedState || state !== storedState) {
    console.error('OAuth State Mismatch detected');
    return NextResponse.json({ error: 'Ungültiger OAuth State (CSRF Schutz)' }, { status: 403 });
  }

  // Clear state cookie
  cookieStore.delete('oauth_state');

  if (!code) {

    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    // Exchange Auth Code for Tokens using native fetch
    const tokenResponse = await fetchWithRetry('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID || '',
        client_secret: env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: env.GOOGLE_REDIRECT_URI || `${env.APP_URL || origin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
       const errorData = await tokenResponse.json();
       console.error('Token Exchange Error occurred');
       throw new Error(`Failed to exchange code for tokens: ${errorData.error_description || errorData.error}`);
    }
    
    const tokens = await tokenResponse.json();
    const idToken = tokens.id_token;

    // Exchange Google ID Token for Firebase ID Token
    const firebaseResp = await fetchWithRetry(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${env.FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: `id_token=${idToken}&providerId=google.com`,
        requestUri: `${env.APP_URL || origin}/api/auth/google/callback`,
        returnIdpCredential: true,
        returnSecureToken: true
      })
    });

    if (!firebaseResp.ok) {
      const err = await firebaseResp.json();
      throw new Error(`Firebase exchange failed: ${err.error?.message}`);
    }

    const firebaseData = await firebaseResp.json();

    // Store tokens in a secure, httpOnly cookie
    
    // Primary app session (ID Token)
    cookieStore.set('wap_session', firebaseData.idToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/'
    });

    // Refresh token for long-lived sessions
    cookieStore.set('wap_refresh', firebaseData.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/'
    });

    // SEC-08 Fix: Store GSC tokens in Firestore instead of cookies to avoid 4KB limit
    try {
      const { updateServerDocument } = await import('@/lib/server-firestore');
      await updateServerDocument('users', firebaseData.localId, {
        gscTokens: JSON.stringify(tokens),
      }, firebaseData.idToken, env);
    } catch (dbErr) {
      console.error('Failed to store GSC tokens in Firestore:', dbErr);
    }


    // Return a simple HTML page that communicates success to the opener and closes
    const appUrl = env.APP_URL || origin;
    const html = `
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff;">
          <script>
            window.opener.postMessage({ type: 'GSC_AUTH_SUCCESS' }, "${appUrl}");
            window.close();
          </script>
          <div style="text-align: center;">
            <h1 style="color: #D4AF37;">Website Analyzer Pro</h1>
            <p>Authentifizierung erfolgreich! Fenster schließt...</p>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error: any) {
    console.error('Google OAuth Callback Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    // Exchange Auth Code for Tokens using native fetch
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
       const errorData = await tokenResponse.json();
       console.error('Token Exchange Error:', errorData);
       throw new Error(`Failed to exchange code for tokens: ${errorData.error_description || errorData.error}`);
    }
    
    const tokens = await tokenResponse.json();
    
    // Store tokens in a secure, httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('gsc_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // Critical for iframe context
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    // Return a simple HTML page that communicates success to the opener and closes
    const html = `
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff;">
          <script>
            window.opener.postMessage({ type: 'GSC_AUTH_SUCCESS' }, window.location.origin);
            window.close();
          </script>
          <div style="text-align: center;">
            <h1 style="color: #D4AF37;">AuraScan</h1>
            <p>Authentifizierung erfolgreich! Dieses Fenster wird geschlossen...</p>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error: any) {
    console.error('Google OAuth Callback Error:', error);
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
  }
}

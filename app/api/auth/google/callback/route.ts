import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/api/auth/google/callback`
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in a secure, httpOnly cookie
    // In a production app, you'd store this in a database linked to a user session
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
        <body>
          <script>
            window.opener.postMessage({ type: 'GSC_AUTH_SUCCESS' }, window.location.origin);
            window.close();
          </script>
          <p>Authentifizierung erfolgreich! Dieses Fenster wird geschlossen...</p>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Google OAuth Callback Error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

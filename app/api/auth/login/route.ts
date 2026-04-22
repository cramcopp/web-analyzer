import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signInWithEmailRest } from '@/lib/auth-server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email und Passwort erforderlich' }, { status: 400 });
    }

    const authData = await signInWithEmailRest(email, password);
    const idToken = authData.idToken;

    // Set a secure, httpOnly cookie for the session
    const cookieStore = await cookies();
    cookieStore.set('wap_session', idToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return NextResponse.json({ 
      success: true,
      user: {
        uid: authData.localId,
        email: authData.email,
        displayName: authData.displayName,
        photoURL: authData.profilePicture
      }
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    let message = 'Anmeldung fehlgeschlagen';
    const errorCode = error.message; // REST API returns error message in text usually

    if (errorCode === 'INVALID_LOGIN_CREDENTIALS' || errorCode === 'INVALID_PASSWORD') {
      message = 'Ungültige E-Mail oder Passwort';
    } else if (errorCode === 'EMAIL_NOT_FOUND') {
      message = 'Nutzer nicht gefunden';
    }
    
    return NextResponse.json({ error: message, code: errorCode }, { status: 401 });
  }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signUpWithEmailRest, updateUserProfile } from '@/lib/auth-server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { email, password, displayName } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email und Passwort erforderlich' }, { status: 400 });
    }

    const authData = await signUpWithEmailRest(email, password);
    const idToken = authData.idToken;
    const refreshToken = authData.refreshToken;

    // Set secure, httpOnly cookies for the session
    const cookieStore = await cookies();
    cookieStore.set('wap_session', idToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });
    
    cookieStore.set('wap_refresh', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });


    if (displayName) {
      try {
        await updateUserProfile({ displayName });
      } catch (updateErr) {
        console.error('Failed to update displayName after signup:', updateErr);
      }
    }

    return NextResponse.json({ 
      success: true,
      user: {
        uid: authData.localId,
        email: authData.email,
        displayName: displayName || authData.displayName,
      }
    });

  } catch (error: any) {
    console.error('Signup Error:', error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
}

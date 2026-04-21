import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email und Passwort erforderlich' }, { status: 400 });
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();

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
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL
      }
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    let message = 'Anmeldung fehlgeschlagen';
    if (error.code === 'auth/invalid-credential') message = 'Ungültige E-Mail oder Passwort';
    if (error.code === 'auth/user-not-found') message = 'Nutzer nicht gefunden';
    
    return NextResponse.json({ error: message, code: error.code }, { status: 401 });
  }
}

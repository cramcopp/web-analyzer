import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '../../../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { email, password, displayName } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email und Passwort erforderlich' }, { status: 400 });
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
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
        displayName: displayName || userCredential.user.displayName,
      }
    });

  } catch (error: any) {
    console.error('Signup Error:', error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
}

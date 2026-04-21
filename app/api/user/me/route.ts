import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth-server';
import { db } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';

export const runtime = 'edge';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    // Wir geben alles in einem Rutsch zurück
    return NextResponse.json({
      authenticated: true,
      user: user,
      userData: docSnap.exists() ? docSnap.data() : null
    });
  } catch (error: any) {
    console.error('Fetch Me Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

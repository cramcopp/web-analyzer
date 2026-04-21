import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const runtime = 'edge';

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      const newUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        plan: 'free',
        reports: [],
        scanCount: 0,
        createdAt: new Date().toISOString()
      };
      await setDoc(docRef, newUser);
      return NextResponse.json({ success: true, user: newUser });
    }

    return NextResponse.json({ success: true, user: docSnap.data() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

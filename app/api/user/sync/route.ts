import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth-server';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const runtime = 'edge';

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
      const newUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: 'user', 
        plan: 'free', 
        subpageLimit: 0, 
        scanCount: 0,
        maxScans: 5,
        resetDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, newUser);
      return NextResponse.json({ success: true, created: true, user: newUser });
    }

    return NextResponse.json({ success: true, created: false, user: snap.data() });
  } catch (error: any) {
    console.error('User Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

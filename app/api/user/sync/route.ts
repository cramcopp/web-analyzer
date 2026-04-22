import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getDocument, setDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existingUserData = await getDocument('users', user.uid);

    if (!existingUserData) {
      const newUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'user',
        plan: 'free',
        reports: [],
        scanCount: 0,
        maxScans: 5,
        createdAt: new Date().toISOString()
      };
      await setDocument('users', user.uid, newUser);
      return NextResponse.json({ success: true, user: newUser });
    }

    return NextResponse.json({ success: true, user: existingUserData });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

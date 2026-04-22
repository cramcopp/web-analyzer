import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, setDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function POST() {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existingUserData = await getDocument('users', user.uid, token);

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
        lastScanReset: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      await setDocument('users', user.uid, newUser, token);
      return NextResponse.json({ success: true, user: newUser });
    }

    return NextResponse.json({ success: true, user: existingUserData });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

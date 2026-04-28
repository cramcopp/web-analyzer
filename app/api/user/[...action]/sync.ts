import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, setDocument } from '@/lib/firestore-edge';
import { PLAN_CONFIG } from '@/lib/stripe';

export const runtime = 'edge';

export async function POST(req: Request) {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existingUserData = await getDocument('users', user.uid, token);

    if (!existingUserData || !existingUserData.plan) {
      const newUser = {
        ...existingUserData,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: existingUserData?.role || 'user',
        plan: existingUserData?.plan || 'free',
        reports: existingUserData?.reports || [],
        scanCount: existingUserData?.scanCount || 0,
        maxScans: existingUserData?.maxScans || PLAN_CONFIG.free.maxScans,
        lastScanReset: existingUserData?.lastScanReset || new Date().toISOString(),
        createdAt: existingUserData?.createdAt || new Date().toISOString()
      };
      // Merging is handled internally if setDocument uses {merge:true}, 
      // but passing the full object ensures everything is written.
      await setDocument('users', user.uid, newUser, token);
      return NextResponse.json({ success: true, user: newUser });
    }

    return NextResponse.json({ success: true, user: existingUserData });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

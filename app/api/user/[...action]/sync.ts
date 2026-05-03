import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, setDocument } from '@/lib/firestore-edge';
import { getMonthlyScanLimit } from '@/lib/plans';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { defaultUserProfile, getCloudflareUserProfile, upsertCloudflareUserProfile } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function POST() {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const d1User = await getCloudflareUserProfile(env, user.uid).catch((error) => {
      console.warn('D1 user sync lookup skipped:', error instanceof Error ? error.message : 'unknown');
      return null;
    });
    if (d1User?.plan) {
      return NextResponse.json({ success: true, user: d1User });
    }

    const existingUserData = await getDocument('users', user.uid, token, env).catch(() => null);

    if (!existingUserData || !existingUserData.plan) {
      const newUser = defaultUserProfile(user, {
        ...existingUserData,
        reports: existingUserData?.reports || [],
        maxScans: existingUserData?.maxScans || getMonthlyScanLimit('free'),
      });
      await upsertCloudflareUserProfile(env, user, newUser).catch((error) => {
        console.warn('D1 user sync write skipped:', error instanceof Error ? error.message : 'unknown');
      });

      // Merging is handled internally if setDocument uses {merge:true}, 
      // but passing the full object ensures everything is written.
      await setDocument('users', user.uid, newUser, null, token, env).catch((error) => {
        console.warn('Firestore user sync skipped during D1 transition:', error instanceof Error ? error.message : 'unknown');
      });
      return NextResponse.json({ success: true, user: newUser });
    }

    await upsertCloudflareUserProfile(env, user, existingUserData).catch((error) => {
      console.warn('D1 user backfill skipped:', error instanceof Error ? error.message : 'unknown');
    });
    return NextResponse.json({ success: true, user: existingUserData });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

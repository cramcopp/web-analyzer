import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { defaultUserProfile, getCloudflareUserProfile, hasCloudflareD1, upsertCloudflareUserProfile } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function POST() {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
  }

  try {
    const existingUser = await getCloudflareUserProfile(env, user.uid);
    if (existingUser?.plan) {
      await upsertCloudflareUserProfile(env, user, existingUser);
      return NextResponse.json({ success: true, user: existingUser, storage: 'cloudflare' });
    }

    const newUser = defaultUserProfile(user);
    await upsertCloudflareUserProfile(env, user, newUser);
    return NextResponse.json({ success: true, user: newUser, storage: 'cloudflare' });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'User Sync fehlgeschlagen' }, { status: 500 });
  }
}

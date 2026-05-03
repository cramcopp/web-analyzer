import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { defaultUserProfile, getCloudflareUserProfile, hasCloudflareD1, patchCloudflareUserProfile, upsertCloudflareUserProfile } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function GET() {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
  }

  try {
    let userData: any = await getCloudflareUserProfile(env, user.uid);
    if (!userData) {
      userData = defaultUserProfile(user);
      await upsertCloudflareUserProfile(env, user, userData);
    }

    const now = new Date();
    const lastReset = userData.lastScanReset ? new Date(userData.lastScanReset) : new Date(userData.createdAt || now);
    const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();

    if (isNewMonth) {
      const resetData = {
        scanCount: 0,
        lastScanReset: now.toISOString(),
      };
      await patchCloudflareUserProfile(env, user.uid, resetData);
      userData = await getCloudflareUserProfile(env, user.uid);
    }

    return NextResponse.json({
      authenticated: true,
      user,
      userData,
    });
  } catch (error) {
    console.error('Fetch Me Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'User konnte nicht geladen werden' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
  }

  try {
    const data = await req.json();
    const allowedFields = ['displayName', 'photoURL', 'brandLogo'];
    const filteredData: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        filteredData[key] = data[key];
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json({ error: 'Keine gueltigen Felder zum Aktualisieren angegeben' }, { status: 400 });
    }

    const updated = await patchCloudflareUserProfile(env, user.uid, filteredData);
    if (!updated) {
      return NextResponse.json({ error: 'User-Profil konnte nicht in D1 aktualisiert werden' }, { status: 503 });
    }

    return NextResponse.json({ success: true, storage: 'cloudflare' });
  } catch (error) {
    console.error('Update User Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'User konnte nicht aktualisiert werden' }, { status: 500 });
  }
}

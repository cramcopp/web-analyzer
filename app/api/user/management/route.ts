import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionUser, deleteUserAccount } from '@/lib/auth-server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { hasCloudflareD1, patchCloudflareUserProfile } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

const userUpdateSchema = z.object({
  displayName: z.string().max(100).optional(),
  photoURL: z.string().url().optional(),
  brandLogo: z.string().url().optional(),
});

export async function PATCH(req: NextRequest) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const result = userUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Ungültige Felder' }, { status: 400 });
    }

    const d1Updated = await patchCloudflareUserProfile(env, user.uid, result.data);
    if (!d1Updated) {
      return NextResponse.json({ error: 'User-Profil konnte nicht in D1 aktualisiert werden' }, { status: 503 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PATCH /api/user/management] Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await deleteUserAccount();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete User Error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

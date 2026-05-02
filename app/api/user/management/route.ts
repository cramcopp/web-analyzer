import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { updateDocument } from '@/lib/firestore-edge';
import { getSessionUser, getSessionToken, deleteUserAccount } from '@/lib/auth-server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

const userUpdateSchema = z.object({
  displayName: z.string().max(100).optional(),
  photoURL: z.string().url().optional(),
  brandLogo: z.string().url().optional(),
});

export async function PATCH(req: NextRequest) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const result = userUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Ungültige Felder' }, { status: 400 });
    }

    // Only update validated fields to prevent privilege escalation
    await updateDocument('users', user.uid, result.data, token, env);
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

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, deleteDocument } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  const { id } = await params;
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const team = await getDocument('teams', id, token, env);

    if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (team.ownerId !== user.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await deleteDocument('teams', id, token, env);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { deleteCloudflareTeam, getCloudflareTeam, hasCloudflareD1 } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
  }

  try {
    const team: any = await getCloudflareTeam(env, id);
    if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (team.ownerId !== user.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const deleted = await deleteCloudflareTeam(env, id, user.uid);
    if (!deleted) {
      return NextResponse.json({ error: 'Team konnte nicht aus D1 geloescht werden' }, { status: 503 });
    }

    return NextResponse.json({ success: true, storage: 'cloudflare' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Team konnte nicht geloescht werden' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { deleteCloudflareProject, getCloudflareProject, hasCloudflareD1, patchCloudflareProject } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
  }

  try {
    const data = await req.json();
    const existingProject = await getCloudflareProject(env, id, user.uid);

    if (!existingProject || 'forbidden' in existingProject) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const saved = await patchCloudflareProject(env, id, user.uid, data);
    if (!saved) {
      return NextResponse.json({ error: 'Projekt konnte nicht in D1 aktualisiert werden' }, { status: 503 });
    }

    return NextResponse.json({ success: true, storage: 'cloudflare' });
  } catch (error) {
    console.error('[PATCH /api/projects/:id] Update error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Projekt konnte nicht aktualisiert werden' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
  }

  try {
    const existingProject = await getCloudflareProject(env, id, user.uid);
    if (!existingProject || 'forbidden' in existingProject) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const deleted = await deleteCloudflareProject(env, id, user.uid);
    if (!deleted) {
      return NextResponse.json({ error: 'Projekt konnte nicht aus D1 geloescht werden' }, { status: 503 });
    }

    return NextResponse.json({ success: true, storage: 'cloudflare' });
  } catch (error) {
    console.error('[DELETE /api/projects/:id] Delete error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Projekt konnte nicht geloescht werden' }, { status: 500 });
  }
}

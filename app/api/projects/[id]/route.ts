import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, updateDocument, deleteDocument } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { deleteCloudflareProject, getCloudflareProject, patchCloudflareProject } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  const { id } = await params;
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const d1Existing = await getCloudflareProject(env, id, user.uid).catch((error) => {
      console.warn('[PATCH /api/projects/:id] D1 lookup skipped:', error instanceof Error ? error.message : 'unknown');
      return null;
    });
    if (d1Existing && 'forbidden' in d1Existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const existingProject = await getDocument('projects', id, token, env).catch(() => null) || d1Existing;

    if (!existingProject || (existingProject.userId !== user.uid && !existingProject.members?.includes(user.uid))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const d1Saved = await patchCloudflareProject(env, id, user.uid, data).catch((error) => {
      console.warn('[PATCH /api/projects/:id] D1 update skipped:', error instanceof Error ? error.message : 'unknown');
      return false;
    });

    try {
      await updateDocument('projects', id, { ...data, updatedAt: new Date().toISOString() }, token, env);
    } catch (firestoreError) {
      if (!d1Saved) throw firestoreError;
      console.warn('[PATCH /api/projects/:id] Firestore skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PATCH /api/projects/:id] Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  const { id } = await params;
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const d1Existing = await getCloudflareProject(env, id, user.uid).catch(() => null);
    if (d1Existing && 'forbidden' in d1Existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const existingProject = await getDocument('projects', id, token, env).catch(() => null) || d1Existing;

    if (!existingProject || (existingProject.userId !== user.uid && !existingProject.members?.includes(user.uid))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const d1Deleted = await deleteCloudflareProject(env, id, user.uid).catch((error) => {
      console.warn('[DELETE /api/projects/:id] D1 delete skipped:', error instanceof Error ? error.message : 'unknown');
      return false;
    });

    try {
      await deleteDocument('projects', id, token, env);
    } catch (firestoreError) {
      if (!d1Deleted) throw firestoreError;
      console.warn('[DELETE /api/projects/:id] Firestore skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/projects/:id] Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

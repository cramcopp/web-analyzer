import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, updateDocument, deleteDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const existingProject = await getDocument('projects', id, token);

    if (!existingProject || existingProject.userId !== user.uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await updateDocument('projects', id, { ...data, updatedAt: new Date().toISOString() }, token);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PATCH /api/projects/:id] Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existingProject = await getDocument('projects', id, token);

    if (!existingProject || existingProject.userId !== user.uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await deleteDocument('projects', id, token);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/projects/:id] Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

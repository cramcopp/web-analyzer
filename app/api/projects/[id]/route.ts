import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getDocument, updateDocument, deleteDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const existingProject = await getDocument('projects', id);

    if (!existingProject || existingProject.userId !== user.uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await updateDocument('projects', id, { ...data, updatedAt: new Date().toISOString() });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existingProject = await getDocument('projects', id);

    if (!existingProject || existingProject.userId !== user.uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await deleteDocument('projects', id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

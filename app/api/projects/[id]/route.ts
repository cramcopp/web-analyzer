import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { db } from '@/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export const runtime = 'edge';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const docRef = doc(db, 'projects', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists() || docSnap.data().userId !== user.uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
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
    const docRef = doc(db, 'projects', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists() || docSnap.data().userId !== user.uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await deleteDoc(docRef);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

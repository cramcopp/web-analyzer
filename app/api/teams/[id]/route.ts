import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { db } from '@/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';

export const runtime = 'edge';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const docRef = doc(db, 'teams', params.id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (docSnap.data().ownerId !== user.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await deleteDoc(docRef);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

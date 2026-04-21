import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth-server';
import { db } from '../../../firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';

export const runtime = 'edge';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const docRef = doc(db, 'teams', id);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Team nicht gefunden' }, { status: 404 });
    }
    
    if (snap.data().ownerId !== user.uid) {
      return NextResponse.json({ error: 'Keine Berechtigung (nur Inhaber)' }, { status: 403 });
    }

    await deleteDoc(docRef);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Team Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

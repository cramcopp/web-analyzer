import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth-server';
import { db } from '../../../firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export const runtime = 'edge';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const updateData = await req.json();
    
    const docRef = doc(db, 'projects', id);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }
    
    // Security check: Only owner can update (simplified for now)
    if (snap.data().userId !== user.uid) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    await updateDoc(docRef, updateData);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update Project Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const docRef = doc(db, 'projects', id);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }
    
    if (snap.data().userId !== user.uid) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    await deleteDoc(docRef);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Project Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

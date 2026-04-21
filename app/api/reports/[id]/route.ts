import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth-server';
import { db } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';

export const runtime = 'edge';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const docRef = doc(db, 'reports', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });
    }

    const data = docSnap.data();
    
    // Security check: only owner can read (simplified)
    if (data.userId !== user.uid) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    return NextResponse.json({ id: docSnap.id, ...data });
  } catch (error: any) {
    console.error('Fetch Report Detail Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

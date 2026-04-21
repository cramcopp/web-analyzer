import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { db } from '@/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, or } from 'firebase/firestore';

export const runtime = 'edge';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const q = query(
      collection(db, 'projects'),
      or(where('userId', '==', user.uid), where('members', 'array-contains', user.uid))
    );
    const snap = await getDocs(q);
    const projects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const docRef = await addDoc(collection(db, 'projects'), {
      ...data,
      userId: user.uid,
      members: [user.uid],
      createdAt: new Date().toISOString()
    });
    return NextResponse.json({ id: docRef.id, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

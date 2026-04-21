import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { db } from '@/firebase';
import { collection, query, where, getDocs, addDoc, or, limit, doc, getDoc } from 'firebase/firestore';

export const runtime = 'edge';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const q = query(
      collection(db, 'teams'),
      or(where('ownerId', '==', user.uid), where('members', 'array-contains', user.uid))
    );
    const snap = await getDocs(q);
    const teams = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Wir nehmen das erste Team für diesen Nutzer
    return NextResponse.json(teams[0] || null);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const docRef = await addDoc(collection(db, 'teams'), {
      name: data.name,
      ownerId: user.uid,
      members: [user.uid],
      admins: [user.uid],
      createdAt: new Date().toISOString()
    });
    
    const newTeam = { id: docRef.id, name: data.name, ownerId: user.uid, members: [user.uid], admins: [user.uid] };
    return NextResponse.json(newTeam);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

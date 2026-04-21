import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth-server';
import { db } from '../../../firebase';
import { collection, query, where, getDocs, addDoc, or, limit, doc, getDoc } from 'firebase/firestore';

export const runtime = 'edge';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const q = query(collection(db, 'teams'), or(
      where('ownerId', '==', user.uid),
      where('members', 'array-contains', user.uid)
    ), limit(1));
    
    const snap = await getDocs(q);
    if (snap.empty) {
      return NextResponse.json(null);
    }
    
    const teamDoc = snap.docs[0];
    const teamData = { id: teamDoc.id, ...teamDoc.data() } as any;

    // Fetch Member Details
    const memberUids = [teamData.ownerId, ...(teamData.members || [])];
    const members: any[] = [];
    
    // Firestore 'in' query is limited to 10-30 items, but for now we'll handle it simply
    const usersQ = query(collection(db, 'users'), where('uid', 'in', memberUids.slice(0, 10)));
    const usersSnap = await getDocs(usersQ);
    usersSnap.forEach(doc => members.push(doc.data()));

    return NextResponse.json({ team: teamData, members });
  } catch (error: any) {
    console.error('Fetch Team Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const teamData = await req.json();
    const docRef = await addDoc(collection(db, 'teams'), {
      ...teamData,
      ownerId: user.uid,
      members: [],
      admins: [],
      createdAt: new Date().toISOString()
    });
    
    return NextResponse.json({ id: docRef.id, success: true });
  } catch (error: any) {
    console.error('Create Team Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


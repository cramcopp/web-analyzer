import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { db } from '@/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, query, collection, where, getDocs, limit, or } from 'firebase/firestore';

export const runtime = 'edge';

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');
  if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });

  try {
    const docRef = doc(db, 'teams', teamId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    
    const team = docSnap.data();
    // Batch fetch member profiles
    const memberUids = team.members || [];
    if (memberUids.length === 0) return NextResponse.json([]);
    
    // Wir können maximal 10 UIDs auf einmal in einem 'in' query abfragen
    const members: any[] = [];
    for (let i = 0; i < memberUids.length; i += 10) {
      const chunk = memberUids.slice(i, i + 10);
      const q = query(collection(db, 'users'), where('uid', 'in', chunk));
      const snap = await getDocs(q);
      snap.forEach(d => members.push(d.data()));
    }

    return NextResponse.json(members);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { teamId, email, action } = await req.json();
    const teamRef = doc(db, 'teams', teamId);

    if (action === 'remove') {
      const { uid } = await req.json(); // Fallback if UID provided directly
      await updateDoc(teamRef, { members: arrayRemove(uid) });
      return NextResponse.json({ success: true });
    }

    // Invite by email: find user UID first
    const userQuery = query(collection(db, 'users'), where('email', '==', email), limit(1));
    const userSnap = await getDocs(userQuery);
    
    if (userSnap.empty) {
      return NextResponse.json({ error: 'Nutzer mit dieser E-Mail nicht gefunden' }, { status: 404 });
    }

    const invitedUser = userSnap.docs[0].data();
    await updateDoc(teamRef, { members: arrayUnion(invitedUser.uid) });
    
    return NextResponse.json({ success: true, user: invitedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { teamId, uid } = await req.json();
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, { 
      members: arrayRemove(uid),
      admins: arrayRemove(uid)
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

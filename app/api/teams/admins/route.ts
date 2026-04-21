import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { db } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, query, collection, where, getDocs, limit } from 'firebase/firestore';

export const runtime = 'edge';

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { teamId, memberUid, action } = await req.json();
    const teamRef = doc(db, 'teams', teamId);
    
    if (action === 'add') {
      await updateDoc(teamRef, { admins: arrayUnion(memberUid) });
    } else {
      await updateDoc(teamRef, { admins: arrayRemove(memberUid) });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth-server';
import { db } from '../../../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, query, collection, where, getDocs, limit } from 'firebase/firestore';

export const runtime = 'edge';

/**
 * Toggle admin status (Owner only)
 */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  try {
    const { uid, isAdmin } = await req.json();
    
    // 1. Only owner can manage admins
    const teamsQ = query(collection(db, 'teams'), where('ownerId', '==', user.uid), limit(1));
    const snap = await getDocs(teamsQ);
    if (snap.empty) {
      return NextResponse.json({ error: 'Keine Berechtigung (nur Inhaber)' }, { status: 403 });
    }
    
    const teamDoc = snap.docs[0];

    // 2. Update admin list
    await updateDoc(doc(db, 'teams', teamDoc.id), {
      admins: isAdmin ? arrayUnion(uid) : arrayRemove(uid)
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Toggle Admin Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

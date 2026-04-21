import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth-server';
import { db } from '../../../firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, query, collection, where, getDocs, limit, or } from 'firebase/firestore';

export const runtime = 'edge';

/**
 * Invite/Add member
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  try {
    const { email } = await req.json();
    
    // 1. Find team where user is owner or admin
    const teamsQ = query(collection(db, 'teams'), or(
      where('ownerId', '==', user.uid),
      where('admins', 'array-contains', user.uid)
    ), limit(1));
    const snap = await getDocs(teamsQ);
    if (snap.empty) return NextResponse.json({ error: 'Kein Team gefunden oder keine Berechtigung' }, { status: 403 });
    
    const teamDoc = snap.docs[0];
    const teamData = teamDoc.data();

    // 2. Find target user by email
    const usersQ = query(collection(db, 'users'), where('email', '==', email.toLowerCase()), limit(1));
    const userSnap = await getDocs(usersQ);
    if (userSnap.empty) return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 });
    
    const targetUser = userSnap.docs[0].data();
    
    if (targetUser.uid === teamData.ownerId || teamData.members.includes(targetUser.uid)) {
      return NextResponse.json({ error: 'Nutzer ist bereits im Team' }, { status: 400 });
    }

    // 3. Update team
    await updateDoc(doc(db, 'teams', teamDoc.id), {
      members: arrayUnion(targetUser.uid)
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Add Member Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Remove/Leave member
 */
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  try {
    const { uid } = await req.json();
    
    const teamsQ = query(collection(db, 'teams'), or(
      where('ownerId', '==', user.uid),
      where('members', 'array-contains', user.uid)
    ), limit(1));
    const snap = await getDocs(teamsQ);
    if (snap.empty) return NextResponse.json({ error: 'Kein Team gefunden' }, { status: 403 });
    
    const teamDoc = snap.docs[0];
    const teamData = teamDoc.data();

    // Check permission: owner can remove anyone, member can only remove self
    if (user.uid !== teamData.ownerId && user.uid !== uid) {
       // Check if user is admin
       if (!teamData.admins.includes(user.uid)) {
         return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
       }
    }

    if (uid === teamData.ownerId) {
      return NextResponse.json({ error: 'Besitzer kann nicht entfernt werden' }, { status: 400 });
    }

    await updateDoc(doc(db, 'teams', teamDoc.id), {
      members: arrayRemove(uid),
      admins: arrayRemove(uid)
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Remove Member Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

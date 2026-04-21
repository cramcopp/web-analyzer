import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth-server';
import { db } from '../../../firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, or } from 'firebase/firestore';

export const runtime = 'edge';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    // 1. Get user document to see if they are in a team
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    // 2. We also need to check team membership (from teams collection)
    const teamsQ = query(collection(db, 'teams'), or(
      where('ownerId', '==', user.uid),
      where('members', 'array-contains', user.uid)
    ));
    const teamsSnap = await getDocs(teamsQ);
    const teamId = !teamsSnap.empty ? teamsSnap.docs[0].id : null;

    // 3. Fetch projects
    const projectsQ = query(
      collection(db, 'projects'),
      or(
        where('userId', '==', user.uid),
        ...(teamId ? [where('teamId', '==', teamId)] : [])
      )
    );
    
    const snap = await getDocs(projectsQ);
    const projects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('Fetch Projects Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const projectData = await req.json();
    const docRef = await addDoc(collection(db, 'projects'), {
      ...projectData,
      userId: user.uid,
      createdAt: new Date().toISOString()
    });
    
    return NextResponse.json({ id: docRef.id, success: true });
  } catch (error: any) {
    console.error('Create Project Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

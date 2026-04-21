import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth-server';
import { db } from '../../../firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, increment } from 'firebase/firestore';

export const runtime = 'edge';

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const urlFilter = searchParams.get('url');

  try {
    let q;
    if (urlFilter) {
      q = query(
        collection(db, 'reports'), 
        where('userId', '==', user.uid), 
        where('url', '==', urlFilter)
      );
    } else {
      q = query(
        collection(db, 'reports'), 
        where('userId', '==', user.uid)
      );
    }
    
    const snap = await getDocs(q);
    const reports = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(reports);
  } catch (error: any) {
    console.error('Fetch Reports Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const reportData = await req.json();
    
    // 1. Save Report
    const docRef = await addDoc(collection(db, 'reports'), {
      ...reportData,
      userId: user.uid,
      createdAt: new Date().toISOString()
    });
    
    // 2. Increment Scan Count on User Profile automatically
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      scanCount: increment(1)
    });

    return NextResponse.json({ id: docRef.id, success: true });
  } catch (error: any) {
    console.error('Save Report Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


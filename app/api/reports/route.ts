import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { queryDocuments, addDocument, updateDocument, getDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function GET(req: Request) {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const urlFilter = searchParams.get('url');

  try {
    const filters: any[] = [{ field: 'userId', op: 'EQUAL', value: user.uid }];
    if (urlFilter) {
      filters.push({ field: 'url', op: 'EQUAL', value: urlFilter });
    }
    
    const reports = await queryDocuments('reports', filters, 'AND', token);
    return NextResponse.json(reports);
  } catch (error: any) {
    console.error('Fetch Reports Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const reportData = await req.json();
    
    // 1. Save Report
    const newReport = await addDocument('reports', {
      ...reportData,
      userId: user.uid,
      createdAt: new Date().toISOString()
    }, token);
    
    // 2. Increment Scan Count on User Profile automatically
    try {
      const userDoc = await getDocument('users', user.uid, token);
      if (userDoc) {
        await updateDocument('users', user.uid, {
          scanCount: (userDoc.scanCount || 0) + 1
        }, token);
      }
    } catch (incError) {
      console.error('Failed to increment scanCount:', incError);
      // We don't fail the whole request if just the counter update fails
    }
    
    return NextResponse.json({ id: newReport.id, success: true });
  } catch (error: any) {
    console.error('Save Report Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

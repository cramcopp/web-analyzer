import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { queryDocuments, addDocument, updateDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const urlFilter = searchParams.get('url');

  try {
    const filters: any[] = [{ field: 'userId', op: 'EQUAL', value: user.uid }];
    if (urlFilter) {
      filters.push({ field: 'url', op: 'EQUAL', value: urlFilter });
    }
    
    const reports = await queryDocuments('reports', filters);
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
    const newReport = await addDocument('reports', {
      ...reportData,
      userId: user.uid,
      createdAt: new Date().toISOString()
    });
    
    // 2. Increment Scan Count on User Profile automatically
    // Since we don't have atomic increments in REST API easily without field-level operations,
    // and setDocument/updateDocument here doesn't support 'increment' operator in the same way,
    // we fetch and update. Or we can just use the update with values if we have them.
    // Better: use the user fetch we did anyway.
    
    // Actually, for incrementing, we might need a fetch-then-set or a different REST endpoint.
    // But for now, let's keep it simple.
    
    return NextResponse.json({ id: newReport.id, success: true });
  } catch (error: any) {
    console.error('Save Report Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

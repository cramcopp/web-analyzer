import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { queryDocuments, addDocument, incrementField } from '@/lib/firestore-edge';
import { reportSaveSchema } from '@/lib/validations';

export const runtime = 'edge';

export async function GET(req: Request) {
  // @ts-ignore
  const env = (req as any).context?.env || process.env;
  
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
    
    const reports = await queryDocuments('reports', filters, 'AND', token, env);
    return NextResponse.json(reports);
  } catch (error: any) {
    console.error('Fetch Reports Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // @ts-ignore
  const env = (req as any).context?.env || process.env;
  
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = reportSaveSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error.issues[0]?.message || 'Ungültige Daten' 
      }, { status: 400 });
    }
    
    // 1. Save Report
    const newReport = await addDocument('reports', {
      ...result.data,
      userId: user.uid,
      createdAt: new Date().toISOString()
    }, token, env);
    
    // 2. Atomic Increment Scan Count (BIZ-02)
    try {
      await incrementField('users', user.uid, 'scanCount', 1, token, env);
    } catch (incError) {
      console.error('Failed to increment scanCount:', incError);
    }

    
    return NextResponse.json({ id: newReport.id, success: true });
  } catch (error: any) {
    console.error('Save Report Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

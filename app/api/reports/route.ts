import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { queryDocuments, addDocument } from '@/lib/firestore-edge';
import { reportSaveSchema } from '@/lib/validations';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { queryCloudflareReports, upsertCloudflareReportDocument } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const env = getRuntimeEnv();
  
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const urlFilter = searchParams.get('url');

  try {
    const d1Reports = await queryCloudflareReports(env, {
      userId: user.uid,
      url: urlFilter,
      limit: 100,
    }).catch((error) => {
      console.warn('D1 reports lookup skipped:', error instanceof Error ? error.message : 'unknown');
      return [];
    });

    if (d1Reports.length > 0) {
      return NextResponse.json(d1Reports);
    }

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
  const env = getRuntimeEnv();
  
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
    
    const reportId = (body.audit_id || body.auditId || crypto.randomUUID()) as string;
    const d1Saved = await upsertCloudflareReportDocument(env, reportId, {
      ...result.data,
      audit_id: reportId,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    }, {
      userId: user.uid,
      projectId: body.projectId,
      url: result.data.url,
    }).catch((error) => {
      console.warn('D1/R2 report save skipped:', error instanceof Error ? error.message : 'unknown');
      return false;
    });

    // 1. Save Report while Firestore is still a read fallback.
    try {
      const newReport = await addDocument('reports', {
        ...result.data,
        userId: user.uid,
        createdAt: new Date().toISOString()
      }, token, env);

      return NextResponse.json({ id: newReport.id, success: true });
    } catch (firestoreError) {
      if (!d1Saved) throw firestoreError;
      console.warn('Firestore report save skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
      return NextResponse.json({ id: reportId, success: true, storage: 'd1' });
    }

  } catch (error: any) {
    console.error('Save Report Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

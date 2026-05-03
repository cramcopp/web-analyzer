import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, updateDocument } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { reportSaveSchema } from '@/lib/validations';
import { getCloudflareReport, upsertCloudflareReportDocument } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

function parseMaybeJson(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  
  const { id } = await params;
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const d1Report = await getCloudflareReport(env, id, user.uid).catch((error) => {
      console.warn('D1 report lookup skipped:', error instanceof Error ? error.message : 'unknown');
      return null;
    });

    if (d1Report && 'forbidden' in d1Report) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    if (d1Report) {
      delete (d1Report as any).adminSecret;
      return NextResponse.json(d1Report);
    }

    const report = await getDocument('reports', id, token, env);

    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (report.userId !== user.uid) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    const rawScrapeData = parseMaybeJson(report.rawScrapeData);
    const mergedReport = rawScrapeData
      ? { ...rawScrapeData, ...report, rawScrapeData }
      : report;

    delete (mergedReport as any).adminSecret;
    return NextResponse.json(mergedReport);
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : 'Unknown Firestore Error';
    console.error(`[API] Error fetching report ${id}:`, msg);
    return NextResponse.json({ 
      error: msg,
      details: 'Prüfe ob die Firestore-Regeln den Zugriff erlauben und ob die Audit-ID korrekt ist.'
    }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  const { id } = await params;
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const d1Existing = await getCloudflareReport(env, id, user.uid).catch(() => null);
    if (d1Existing && 'forbidden' in d1Existing) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    const existing = await getDocument('reports', id, token, env).catch(() => null) || d1Existing;
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing.userId !== user.uid) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    const body = await req.json();
    const result = reportSaveSchema.partial().safeParse(body);

    if (!result.success) {
      return NextResponse.json({
        error: result.error.issues[0]?.message || 'Ungueltige Daten',
      }, { status: 400 });
    }

    const updatedPayload = {
      ...result.data,
      status: body.status || existing.status || 'completed',
      progress: typeof body.progress === 'number' ? body.progress : 100,
      updatedAt: new Date().toISOString(),
    };

    const d1Saved = await upsertCloudflareReportDocument(env, id, {
      ...existing,
      ...updatedPayload,
      audit_id: id,
      userId: user.uid,
      createdAt: existing.createdAt || new Date().toISOString(),
    }, {
      userId: user.uid,
      projectId: existing.projectId || body.projectId,
      url: body.url || existing.url,
    }).catch((error) => {
      console.warn('D1/R2 report patch skipped:', error instanceof Error ? error.message : 'unknown');
      return false;
    });

    try {
      const updated = await updateDocument('reports', id, updatedPayload, token, env);
      return NextResponse.json({ id, success: true, report: updated });
    } catch (firestoreError) {
      if (!d1Saved) throw firestoreError;
      console.warn('Firestore report patch skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
      return NextResponse.json({ id, success: true, storage: 'd1' });
    }
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : 'Unknown Firestore Error';
    console.error(`[API] Error updating report ${id}:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

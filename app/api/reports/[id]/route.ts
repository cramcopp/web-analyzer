import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { reportSaveSchema } from '@/lib/validations';
import { getCloudflareReport, hasCloudflareD1, upsertCloudflareReportDocument } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  try {
    const report = await getCloudflareReport(env, id, user.uid);
    if (report && 'forbidden' in report) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Report konnte nicht geladen werden';
    console.error(`[API] Error fetching report ${id}:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  try {
    const existing = await getCloudflareReport(env, id, user.uid);
    if (existing && 'forbidden' in existing) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const result = reportSaveSchema.partial().safeParse(body);

    if (!result.success) {
      return NextResponse.json({
        error: result.error.issues[0]?.message || 'Ungültige Daten',
      }, { status: 400 });
    }

    const updatedPayload = {
      ...existing,
      ...result.data,
      status: body.status || existing.status || 'completed',
      progress: typeof body.progress === 'number' ? body.progress : 100,
      audit_id: id,
      userId: user.uid,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await upsertCloudflareReportDocument(env, id, updatedPayload, {
      userId: user.uid,
      projectId: existing.projectId || body.projectId,
      url: body.url || existing.url,
    });

    if (!saved) {
      return NextResponse.json({ error: 'Report konnte nicht in D1/R2 aktualisiert werden' }, { status: 503 });
    }

    return NextResponse.json({ id, success: true, storage: 'cloudflare' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Report konnte nicht aktualisiert werden';
    console.error(`[API] Error updating report ${id}:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

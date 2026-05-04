import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { reportSaveSchema } from '@/lib/validations';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { hasCloudflareD1, queryCloudflareReports, upsertCloudflareReportDocument } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const urlFilter = searchParams.get('url');

  try {
    const reports = await queryCloudflareReports(env, {
      userId: user.uid,
      url: urlFilter,
      limit: 100,
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Fetch Reports Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Reports konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const result = reportSaveSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({
        error: result.error.issues[0]?.message || 'Ungültige Daten',
      }, { status: 400 });
    }

    const reportId = (body.audit_id || body.auditId || crypto.randomUUID()) as string;
    const saved = await upsertCloudflareReportDocument(env, reportId, {
      ...result.data,
      audit_id: reportId,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    }, {
      userId: user.uid,
      projectId: body.projectId,
      url: result.data.url,
    });

    if (!saved) {
      return NextResponse.json({ error: 'Report konnte nicht in D1/R2 gespeichert werden' }, { status: 503 });
    }

    return NextResponse.json({ id: reportId, success: true, storage: 'cloudflare' });
  } catch (error) {
    console.error('Save Report Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Report konnte nicht gespeichert werden' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { publicReportCsv, publicReportJson, publicReportPdf } from '@/lib/reporting/exports';
import { sanitizeReportForClient } from '@/lib/reporting/sanitize-report';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { getCloudflareReport, hasCloudflareD1, putReportExportText } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

function contentDisposition(filename: string) {
  return `attachment; filename="${filename.replace(/"/g, '')}"`;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'json';

  try {
    const report = await getCloudflareReport(env, id, user.uid);
    if (!report) return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });
    if ('forbidden' in report) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });

    const sanitized = sanitizeReportForClient(report);
    const baseName = `wap_report_${id}`;

    if (format === 'csv') {
      const body = publicReportCsv(sanitized);
      await putReportExportText(env, `exports/${user.uid}/${id}/${baseName}.csv`, body, 'text/csv;charset=utf-8').catch(() => null);
      return new NextResponse(body, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': contentDisposition(`${baseName}.csv`),
        },
      });
    }

    if (format === 'pdf') {
      const body = publicReportPdf(sanitized);
      await putReportExportText(env, `exports/${user.uid}/${id}/${baseName}.pdf`, body, 'application/pdf').catch(() => null);
      return new NextResponse(body, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': contentDisposition(`${baseName}.pdf`),
        },
      });
    }

    const body = publicReportJson(sanitized);
    await putReportExportText(env, `exports/${user.uid}/${id}/${baseName}.json`, body, 'application/json;charset=utf-8').catch(() => null);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Content-Disposition': contentDisposition(`${baseName}.json`),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Report Export fehlgeschlagen' }, { status: 500 });
  }
}

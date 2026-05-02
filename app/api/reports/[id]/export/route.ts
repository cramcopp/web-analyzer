import { NextResponse } from 'next/server';
import { getSessionToken, getSessionUser } from '@/lib/auth-server';
import { getDocument } from '@/lib/firestore-edge';
import { publicReportCsv, publicReportJson, publicReportPdf } from '@/lib/reporting/exports';
import { sanitizeReportForClient } from '@/lib/reporting/sanitize-report';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

function getEnv() {
  return getRuntimeEnv();
}

function contentDisposition(filename: string) {
  return `attachment; filename="${filename.replace(/"/g, '')}"`;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const env = getEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'json';

  try {
    const report = await getDocument('reports', id, token, env) as any;
    if (!report) return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });
    if (report.userId !== user.uid) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });

    const sanitized = sanitizeReportForClient(report);
    const baseName = `wap_report_${id}`;

    if (format === 'csv') {
      return new NextResponse(publicReportCsv(sanitized), {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': contentDisposition(`${baseName}.csv`),
        },
      });
    }

    if (format === 'pdf') {
      return new NextResponse(publicReportPdf(sanitized), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': contentDisposition(`${baseName}.pdf`),
        },
      });
    }

    return new NextResponse(publicReportJson(sanitized), {
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Content-Disposition': contentDisposition(`${baseName}.json`),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Report Export fehlgeschlagen' }, { status: 500 });
  }
}

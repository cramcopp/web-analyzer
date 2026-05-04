import { NextResponse } from 'next/server';
import { sanitizeReportForClient } from '@/lib/reporting/sanitize-report';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { getCloudflareReport, getCloudflareReportShare, hasCloudflareD1 } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const env = getRuntimeEnv();
  const { token } = await params;
  const { searchParams } = new URL(req.url);

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  try {
    const share: any = await getCloudflareReportShare(env, token);
    if (!share) return NextResponse.json({ error: 'Report Share nicht gefunden' }, { status: 404 });
    if (share.visibility === 'private') return NextResponse.json({ error: 'Report ist privat' }, { status: 403 });

    if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Report Link ist abgelaufen' }, { status: 410 });
    }

    if (share.visibility === 'password') {
      const password = searchParams.get('password') || '';
      const passwordHash = await sha256(password);
      if (!password || passwordHash !== share.passwordHash) {
        return NextResponse.json({ error: 'Passwort erforderlich' }, { status: 401 });
      }
    }

    const report = await getCloudflareReport(env, share.reportId, null);
    if (!report) return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });
    if ('forbidden' in report) return NextResponse.json({ error: 'Report nicht verfügbar' }, { status: 403 });

    return NextResponse.json({
      share: {
        token: share.token,
        visibility: share.visibility,
        branding: share.branding || null,
        builder: share.builder || null,
        createdAt: share.createdAt,
      },
      report: sanitizeReportForClient(report, share.builder || null),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Public Report konnte nicht geladen werden' }, { status: 500 });
  }
}

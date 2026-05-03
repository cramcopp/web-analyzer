import { NextResponse } from 'next/server';
import { getServerDocument } from '@/lib/server-firestore';
import { sanitizeReportForClient } from '@/lib/reporting/sanitize-report';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

function getEnv() {
  return getRuntimeEnv();
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const env = getEnv();
  const { token } = await params;
  const { searchParams } = new URL(req.url);

  try {
    const share = await getServerDocument('reportShares', token, null, env) as any;
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

    const report = await getServerDocument('reports', share.reportId, null, env);
    if (!report) return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Public Report konnte nicht geladen werden' }, { status: 500 });
  }
}

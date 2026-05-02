import { NextResponse } from 'next/server';
import { getSessionToken, getSessionUser } from '@/lib/auth-server';
import { getDocument, queryDocuments, setDocument } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import type { ReportVisibility } from '@/types/reporting';

export const runtime = 'nodejs';

function getEnv() {
  return getRuntimeEnv();
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeVisibility(value: unknown): ReportVisibility {
  if (value === 'public' || value === 'password') return value;
  return 'private';
}

export async function GET(req: Request) {
  const env = getEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get('reportId');
  const filters: any[] = [{ field: 'userId', op: 'EQUAL', value: user.uid }];
  if (reportId) filters.push({ field: 'reportId', op: 'EQUAL', value: reportId });

  try {
    const shares = await queryDocuments('reportShares', filters, 'AND', token, env);
    return NextResponse.json(shares.map((share: any) => ({ ...share, passwordHash: undefined })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Share Links konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const env = getEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  try {
    const body = await req.json();
    const reportId = String(body.reportId || '');
    if (!reportId) return NextResponse.json({ error: 'reportId fehlt' }, { status: 400 });

    const report = await getDocument('reports', reportId, token, env);
    if (!report || (report as any).userId !== user.uid) {
      return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });
    }

    const visibility = normalizeVisibility(body.visibility);
    if (visibility === 'password' && !body.password) {
      return NextResponse.json({ error: 'Passwort fehlt' }, { status: 400 });
    }

    const tokenId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await setDocument('reportShares', tokenId, {
      token: tokenId,
      reportId,
      projectId: body.projectId || null,
      userId: user.uid,
      visibility,
      passwordHash: visibility === 'password' ? await sha256(String(body.password)) : null,
      createdAt,
      expiresAt: body.expiresAt || null,
      branding: body.branding || null,
      builder: body.builder ? { ...body.builder, includeDebugData: false, updatedAt: createdAt } : null,
    }, null, token, env);

    return NextResponse.json({
      token: tokenId,
      url: `/reports/${tokenId}`,
      apiUrl: `/api/public-reports/${tokenId}`,
      visibility,
      createdAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Share Link konnte nicht erstellt werden' }, { status: 500 });
  }
}

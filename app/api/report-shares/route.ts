import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import type { ReportVisibility } from '@/types/reporting';
import {
  getCloudflareReport,
  hasCloudflareD1,
  queryCloudflareReportShares,
  upsertCloudflareReportShare,
} from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

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
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get('reportId');

  try {
    const shares = await queryCloudflareReportShares(env, { userId: user.uid, reportId });
    return NextResponse.json(shares.map((share: any) => ({ ...share, passwordHash: undefined })));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Share Links konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const reportId = String(body.reportId || '');
    if (!reportId) return NextResponse.json({ error: 'reportId fehlt' }, { status: 400 });

    const report = await getCloudflareReport(env, reportId, user.uid);
    if (!report || 'forbidden' in report) {
      return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });
    }

    const visibility = normalizeVisibility(body.visibility);
    if (visibility === 'password' && !body.password) {
      return NextResponse.json({ error: 'Passwort fehlt' }, { status: 400 });
    }

    const tokenId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const sharePayload = {
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
    };

    const saved = await upsertCloudflareReportShare(env, sharePayload);
    if (!saved) {
      return NextResponse.json({ error: 'Share Link konnte nicht in D1 gespeichert werden' }, { status: 503 });
    }

    return NextResponse.json({
      token: tokenId,
      url: `/reports/${tokenId}`,
      apiUrl: `/api/public-reports/${tokenId}`,
      visibility,
      createdAt,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Share Link konnte nicht erstellt werden' }, { status: 500 });
  }
}

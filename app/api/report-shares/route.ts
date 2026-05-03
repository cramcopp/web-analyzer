import { NextResponse } from 'next/server';
import { getSessionToken, getSessionUser } from '@/lib/auth-server';
import { getDocument } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { queryServerDocuments, setServerDocument } from '@/lib/server-firestore';
import type { ReportVisibility } from '@/types/reporting';
import {
  getCloudflareReport,
  queryCloudflareReportShares,
  upsertCloudflareReportShare,
} from '@/lib/cloudflare-storage';

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
    const d1Shares = await queryCloudflareReportShares(env, { userId: user.uid, reportId }).catch((error) => {
      console.warn('D1 report shares lookup skipped:', error instanceof Error ? error.message : 'unknown');
      return [];
    });
    if (d1Shares.length > 0) {
      return NextResponse.json(d1Shares.map((share: any) => ({ ...share, passwordHash: undefined })));
    }

    const shares = await queryServerDocuments('reportShares', filters, 'AND', token, env);
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

    const d1Report = await getCloudflareReport(env, reportId, user.uid).catch(() => null);
    const report = d1Report && !('forbidden' in d1Report)
      ? d1Report
      : await getDocument('reports', reportId, token, env).catch(() => null);
    if (!report || (report as any).userId !== user.uid) {
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

    const d1Saved = await upsertCloudflareReportShare(env, sharePayload).catch((error) => {
      console.warn('D1 report share save skipped:', error instanceof Error ? error.message : 'unknown');
      return false;
    });

    try {
      await setServerDocument('reportShares', tokenId, sharePayload, null, token, env);
    } catch (firestoreError) {
      if (!d1Saved) throw firestoreError;
      console.warn('Firestore report share save skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
    }

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

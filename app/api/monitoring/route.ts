import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { hasCloudflareD1, queryCloudflareMonitoring, upsertCloudflareMonitoringItem } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

const monitoredCollections = ['scheduledScans', 'alertRules', 'alertEvents', 'uptimeChecks', 'scanDiffs'] as const;
type MonitoredCollection = typeof monitoredCollections[number];

function isMonitoredCollection(value: string | null): value is MonitoredCollection {
  return monitoredCollections.includes(value as MonitoredCollection);
}

export async function GET(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });

  try {
    const monitoring = await queryCloudflareMonitoring(env, { userId: user.uid, projectId });
    return NextResponse.json(monitoring);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Monitoring konnte nicht geladen werden' }, { status: 500 });
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
    const collection = body.collection as string | null;
    if (!isMonitoredCollection(collection)) {
      return NextResponse.json({ error: 'Ungueltige Monitoring Collection' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { id: _ignoredDataId, ...dataWithoutClientId } = body.data || {};
    const payload = {
      ...dataWithoutClientId,
      userId: user.uid,
      projectId: body.projectId || dataWithoutClientId.projectId,
      createdAt: dataWithoutClientId.createdAt || now,
      updatedAt: now,
    };

    if (!payload.projectId) {
      return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });
    }

    const id = body.id || crypto.randomUUID();
    const saved = await upsertCloudflareMonitoringItem(env, {
      collection,
      id,
      userId: user.uid,
      projectId: payload.projectId,
      data: payload,
    });

    if (!saved) {
      return NextResponse.json({ error: 'Monitoring konnte nicht in D1 gespeichert werden' }, { status: 503 });
    }

    return NextResponse.json({ id, success: true, storage: 'cloudflare' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Monitoring konnte nicht gespeichert werden' }, { status: 500 });
  }
}

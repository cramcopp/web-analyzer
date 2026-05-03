import { NextResponse } from 'next/server';
import { getSessionToken, getSessionUser } from '@/lib/auth-server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { addServerDocument, queryServerDocuments, updateServerDocument } from '@/lib/server-firestore';
import { queryCloudflareMonitoring, upsertCloudflareMonitoringItem } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

const monitoredCollections = ['scheduledScans', 'alertRules', 'alertEvents', 'uptimeChecks', 'scanDiffs'] as const;
type MonitoredCollection = typeof monitoredCollections[number];

function getEnv() {
  return getRuntimeEnv();
}

function isMonitoredCollection(value: string | null): value is MonitoredCollection {
  return monitoredCollections.includes(value as MonitoredCollection);
}

export async function GET(req: Request) {
  const env = getEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });

  try {
    const d1Monitoring = await queryCloudflareMonitoring(env, { userId: user.uid, projectId }).catch((error) => {
      console.warn('D1 monitoring lookup skipped:', error instanceof Error ? error.message : 'unknown');
      return null;
    });

    if (d1Monitoring) {
      return NextResponse.json(d1Monitoring);
    }

    const filters = [
      { field: 'userId', op: 'EQUAL', value: user.uid },
      { field: 'projectId', op: 'EQUAL', value: projectId },
    ];

    const [scheduledScans, alertRules, alertEvents, uptimeChecks, scanDiffs] = await Promise.all([
      queryServerDocuments('scheduledScans', filters, 'AND', token, env),
      queryServerDocuments('alertRules', filters, 'AND', token, env),
      queryServerDocuments('alertEvents', filters, 'AND', token, env),
      queryServerDocuments('uptimeChecks', filters, 'AND', token, env),
      queryServerDocuments('scanDiffs', filters, 'AND', token, env),
    ]);

    return NextResponse.json({ scheduledScans, alertRules, alertEvents, uptimeChecks, scanDiffs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Monitoring konnte nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const env = getEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

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
    const d1Saved = await upsertCloudflareMonitoringItem(env, {
      collection,
      id,
      userId: user.uid,
      projectId: payload.projectId,
      data: payload,
    }).catch((error) => {
      console.warn('D1 monitoring save skipped:', error instanceof Error ? error.message : 'unknown');
      return false;
    });

    if (body.id) {
      try {
        await updateServerDocument(collection, body.id, payload, token, env);
      } catch (firestoreError) {
        if (!d1Saved) throw firestoreError;
        console.warn('Firestore monitoring update skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
      }
      return NextResponse.json({ id: body.id, success: true });
    }

    try {
      const created = await addServerDocument(collection, payload, token, env);
      return NextResponse.json({ id: created.id, success: true });
    } catch (firestoreError) {
      if (!d1Saved) throw firestoreError;
      console.warn('Firestore monitoring create skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
      return NextResponse.json({ id, success: true, storage: 'd1' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Monitoring konnte nicht gespeichert werden' }, { status: 500 });
  }
}

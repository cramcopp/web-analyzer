import { NextResponse } from 'next/server';
import { getSessionToken, getSessionUser } from '@/lib/auth-server';
import { addDocument, queryDocuments, updateDocument } from '@/lib/firestore-edge';

export const runtime = 'nodejs';

const monitoredCollections = ['scheduledScans', 'alertRules', 'alertEvents', 'uptimeChecks', 'scanDiffs'] as const;
type MonitoredCollection = typeof monitoredCollections[number];

function getEnv(req: Request) {
  return (req as any).context?.env || process.env;
}

function isMonitoredCollection(value: string | null): value is MonitoredCollection {
  return monitoredCollections.includes(value as MonitoredCollection);
}

export async function GET(req: Request) {
  const env = getEnv(req);
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });

  try {
    const filters = [
      { field: 'userId', op: 'EQUAL', value: user.uid },
      { field: 'projectId', op: 'EQUAL', value: projectId },
    ];

    const [scheduledScans, alertRules, alertEvents, uptimeChecks, scanDiffs] = await Promise.all([
      queryDocuments('scheduledScans', filters, 'AND', token, env),
      queryDocuments('alertRules', filters, 'AND', token, env),
      queryDocuments('alertEvents', filters, 'AND', token, env),
      queryDocuments('uptimeChecks', filters, 'AND', token, env),
      queryDocuments('scanDiffs', filters, 'AND', token, env),
    ]);

    return NextResponse.json({ scheduledScans, alertRules, alertEvents, uptimeChecks, scanDiffs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Monitoring konnte nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const env = getEnv(req);
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
    const payload = {
      ...body.data,
      userId: user.uid,
      projectId: body.projectId || body.data?.projectId,
      createdAt: body.data?.createdAt || now,
      updatedAt: now,
    };

    if (!payload.projectId) {
      return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });
    }

    if (body.id) {
      await updateDocument(collection, body.id, payload, token, env);
      return NextResponse.json({ id: body.id, success: true });
    }

    const created = await addDocument(collection, payload, token, env);
    return NextResponse.json({ id: created.id, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Monitoring konnte nicht gespeichert werden' }, { status: 500 });
  }
}

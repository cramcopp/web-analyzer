import { NextResponse } from 'next/server';
import { getSessionToken, getSessionUser } from '@/lib/auth-server';
import { addServerDocument, queryServerDocuments, setServerDocument } from '@/lib/server-firestore';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { queryCloudflareAgencyData, upsertCloudflareAgencyItem } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

function getEnv() {
  return getRuntimeEnv();
}

function docId(...parts: string[]) {
  return parts.map((part) => part.replace(/[^\w-]/g, '_')).join('_');
}

export async function GET(req: Request) {
  const env = getEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });

  const filters = [
    { field: 'userId', op: 'EQUAL', value: user.uid },
    { field: 'projectId', op: 'EQUAL', value: projectId },
  ];

  try {
    const d1Agency = await queryCloudflareAgencyData(env, { userId: user.uid, projectId }).catch((error) => {
      console.warn('D1 agency data lookup skipped:', error instanceof Error ? error.message : 'unknown');
      return null;
    });

    if (d1Agency) {
      return NextResponse.json(d1Agency);
    }

    const [branding, issueTasks, issueComments, scheduledReports] = await Promise.all([
      queryServerDocuments('reportBranding', filters, 'AND', token, env),
      queryServerDocuments('issueTasks', filters, 'AND', token, env),
      queryServerDocuments('issueComments', filters, 'AND', token, env),
      queryServerDocuments('scheduledReports', filters, 'AND', token, env),
    ]);

    return NextResponse.json({ branding, issueTasks, issueComments, scheduledReports });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Agency Reporting konnte nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const env = getEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  try {
    const body = await req.json();
    const action = String(body.action || '');
    const projectId = String(body.projectId || body.data?.projectId || '');
    if (!projectId) return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });

    const now = new Date().toISOString();

    if (action === 'saveBranding') {
      const scope = body.data?.scope === 'team' ? 'team' : 'project';
      const id = docId(projectId, scope, body.data?.teamId || user.uid);
      const payload = {
        ...body.data,
        id,
        userId: user.uid,
        projectId,
        teamId: body.data?.teamId || user.uid,
        scope,
        updatedAt: now,
      };
      const d1Saved = await upsertCloudflareAgencyItem(env, { action, id, userId: user.uid, projectId, data: payload }).catch(() => false);
      await setServerDocument('reportBranding', id, payload, null, token, env).catch((firestoreError) => {
        if (!d1Saved) throw firestoreError;
        console.warn('Firestore agency branding skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
      });
      return NextResponse.json({ id, success: true });
    }

    if (action === 'saveTask') {
      const issueId = String(body.data?.issueId || '');
      if (!issueId) return NextResponse.json({ error: 'issueId fehlt' }, { status: 400 });
      const id = body.data?.id || docId(projectId, issueId);
      const payload = {
        ...body.data,
        id,
        userId: user.uid,
        projectId,
        issueId,
        createdAt: body.data?.createdAt || now,
        updatedAt: now,
      };
      const d1Saved = await upsertCloudflareAgencyItem(env, { action, id, userId: user.uid, projectId, data: payload }).catch(() => false);
      await setServerDocument('issueTasks', id, payload, null, token, env).catch((firestoreError) => {
        if (!d1Saved) throw firestoreError;
        console.warn('Firestore agency task skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
      });
      return NextResponse.json({ id, success: true });
    }

    if (action === 'addComment') {
      const issueId = String(body.data?.issueId || '');
      const bodyText = String(body.data?.body || '').trim();
      if (!issueId || !bodyText) return NextResponse.json({ error: 'issueId und Kommentar fehlen' }, { status: 400 });
      const id = crypto.randomUUID();
      const payload = {
        id,
        projectId,
        issueId,
        body: bodyText,
        authorId: user.uid,
        authorName: user.email || 'Team',
        userId: user.uid,
        createdAt: now,
      };
      const d1Saved = await upsertCloudflareAgencyItem(env, { action, id, userId: user.uid, projectId, data: payload }).catch(() => false);
      try {
        const created = await addServerDocument('issueComments', payload, token, env);
        return NextResponse.json({ id: created.id, success: true });
      } catch (firestoreError) {
        if (!d1Saved) throw firestoreError;
        console.warn('Firestore agency comment skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
        return NextResponse.json({ id, success: true, storage: 'd1' });
      }
    }

    if (action === 'saveScheduledReport') {
      const id = body.data?.id || docId(projectId, 'scheduled_report', body.data?.frequency || 'weekly');
      const payload = {
        ...body.data,
        id,
        userId: user.uid,
        projectId,
        mailProviderConnected: false,
        createdAt: body.data?.createdAt || now,
        updatedAt: now,
      };
      const d1Saved = await upsertCloudflareAgencyItem(env, { action, id, userId: user.uid, projectId, data: payload }).catch(() => false);
      await setServerDocument('scheduledReports', id, payload, null, token, env).catch((firestoreError) => {
        if (!d1Saved) throw firestoreError;
        console.warn('Firestore scheduled report skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
      });
      return NextResponse.json({ id, success: true });
    }

    return NextResponse.json({ error: 'Ungueltige Aktion' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Agency Reporting konnte nicht gespeichert werden' }, { status: 500 });
  }
}

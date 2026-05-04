import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { getCloudflareUserProfile, hasCloudflareD1, queryCloudflareAgencyData, upsertCloudflareAgencyItem } from '@/lib/cloudflare-storage';
import { hasPlanRank } from '@/lib/plans';

export const runtime = 'nodejs';

function docId(...parts: string[]) {
  return parts.map((part) => part.replace(/[^\w-]/g, '_')).join('_');
}

export async function GET(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  const userProfile = await getCloudflareUserProfile(env, user.uid);
  if (!hasPlanRank(userProfile?.plan, 'agency')) {
    return NextResponse.json({ error: 'Agency Reporting ist ab dem Agency-Plan verfügbar.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });

  try {
    const agency = await queryCloudflareAgencyData(env, { userId: user.uid, projectId });
    return NextResponse.json(agency);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Agency Reporting konnte nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  const userProfile = await getCloudflareUserProfile(env, user.uid);
  if (!hasPlanRank(userProfile?.plan, 'agency')) {
    return NextResponse.json({ error: 'Agency Reporting ist ab dem Agency-Plan verfügbar.' }, { status: 403 });
  }

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
      const saved = await upsertCloudflareAgencyItem(env, { action, id, userId: user.uid, projectId, data: payload });
      return saved
        ? NextResponse.json({ id, success: true, storage: 'cloudflare' })
        : NextResponse.json({ error: 'Branding konnte nicht in D1 gespeichert werden' }, { status: 503 });
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
      const saved = await upsertCloudflareAgencyItem(env, { action, id, userId: user.uid, projectId, data: payload });
      return saved
        ? NextResponse.json({ id, success: true, storage: 'cloudflare' })
        : NextResponse.json({ error: 'Task konnte nicht in D1 gespeichert werden' }, { status: 503 });
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
      const saved = await upsertCloudflareAgencyItem(env, { action, id, userId: user.uid, projectId, data: payload });
      return saved
        ? NextResponse.json({ id, success: true, storage: 'cloudflare' })
        : NextResponse.json({ error: 'Kommentar konnte nicht in D1 gespeichert werden' }, { status: 503 });
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
      const saved = await upsertCloudflareAgencyItem(env, { action, id, userId: user.uid, projectId, data: payload });
      return saved
        ? NextResponse.json({ id, success: true, storage: 'cloudflare' })
        : NextResponse.json({ error: 'Geplanter Report konnte nicht in D1 gespeichert werden' }, { status: 503 });
    }

    return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Agency Reporting konnte nicht gespeichert werden' }, { status: 500 });
  }
}

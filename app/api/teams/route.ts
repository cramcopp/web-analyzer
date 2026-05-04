import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { teamCreateSchema } from '@/lib/validations';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { hasPlanRank } from '@/lib/plans';
import {
  createCloudflareTeam,
  getCloudflareUserProfile,
  getCloudflareUsersByIds,
  hasCloudflareD1,
  queryCloudflareTeamForMember,
} from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function GET() {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  try {
    const team: any = await queryCloudflareTeamForMember(env, user.uid);
    if (!team) {
      return NextResponse.json(null);
    }

    const memberDocs = await getCloudflareUsersByIds(env, team.members);
    const members = memberDocs.map((member: any) => ({
      uid: member.uid,
      email: member.email,
      displayName: member.displayName,
    }));

    return NextResponse.json({ team, members });
  } catch (error) {
    console.error('Teams Fetch Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Team konnte nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  try {
    const userData = await getCloudflareUserProfile(env, user.uid);
    if (!hasPlanRank(userData?.plan, 'agency')) {
      return NextResponse.json({
        error: 'Team-Funktionen sind ab dem Agency-Plan verfügbar.',
      }, { status: 403 });
    }

    const body = await req.json();
    const result = teamCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({
        error: result.error.issues[0]?.message || 'Ungültige Eingabe',
      }, { status: 400 });
    }

    const teamId = crypto.randomUUID();
    const created = await createCloudflareTeam(env, {
      id: teamId,
      name: result.data.name,
      ownerId: user.uid,
      members: [user.uid],
      admins: [user.uid],
      createdAt: new Date().toISOString(),
    });

    if (!created) {
      return NextResponse.json({ error: 'Team konnte nicht in D1 erstellt werden' }, { status: 503 });
    }

    return NextResponse.json({
      id: teamId,
      name: result.data.name,
      ownerId: user.uid,
      members: [user.uid],
      admins: [user.uid],
      success: true,
      storage: 'cloudflare',
    });
  } catch (error) {
    console.error('[POST /api/teams] Creation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Team konnte nicht erstellt werden' }, { status: 500 });
  }
}

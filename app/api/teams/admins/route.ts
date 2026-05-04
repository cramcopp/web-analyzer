import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { hasCloudflareD1, queryCloudflareTeamForMember, updateCloudflareTeam } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  try {
    const { uid, isAdmin } = await req.json();
    const team: any = await queryCloudflareTeamForMember(env, user.uid);

    if (!team || team.ownerId !== user.uid) {
      return NextResponse.json({ error: 'Team not found or not owner' }, { status: 403 });
    }

    if (isAdmin && !team.members.includes(uid)) {
      return NextResponse.json({ error: 'Nutzer ist kein Team-Mitglied' }, { status: 400 });
    }

    const admins = new Set<string>(team.admins || []);
    if (isAdmin) admins.add(uid);
    else admins.delete(uid);
    admins.add(team.ownerId);

    const updated = await updateCloudflareTeam(env, team.id, { admins: Array.from(admins) });
    if (!updated) {
      return NextResponse.json({ error: 'Team Admins konnten nicht in D1 aktualisiert werden' }, { status: 503 });
    }

    return NextResponse.json({ success: true, storage: 'cloudflare' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Team Admins konnten nicht aktualisiert werden' }, { status: 500 });
  }
}

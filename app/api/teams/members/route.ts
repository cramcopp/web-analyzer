import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { teamInviteSchema, teamMemberSchema } from '@/lib/validations';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import {
  getCloudflareUserByEmail,
  getCloudflareUserProfile,
  hasCloudflareD1,
  queryCloudflareTeamForMember,
  updateCloudflareTeam,
} from '@/lib/cloudflare-storage';
import { getEffectivePlanConfig } from '@/lib/plans';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const result = teamInviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({
        error: result.error.issues[0]?.message || 'Ungültige E-Mail',
      }, { status: 400 });
    }

    const team: any = await queryCloudflareTeamForMember(env, user.uid);
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const isOwner = team.ownerId === user.uid;
    const isAdmin = team.admins?.includes(user.uid);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only owners and admins can invite members.' }, { status: 403 });
    }

    const invitedUser = await getCloudflareUserByEmail(env, result.data.email);
    if (!invitedUser) {
      return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 });
    }

    if (team.members.includes(String(invitedUser.uid))) {
      return NextResponse.json({ error: 'Nutzer ist bereits im Team' }, { status: 400 });
    }

    const ownerProfile = await getCloudflareUserProfile(env, team.ownerId);
    const seatLimit = getEffectivePlanConfig(ownerProfile?.plan, ownerProfile?.addOns).seats;
    if (team.members.length >= seatLimit) {
      return NextResponse.json({
        error: 'Seat-Limit erreicht',
        details: `Der aktuelle Plan erlaubt ${seatLimit} Nutzer/Seats.`,
      }, { status: 403 });
    }

    const updatedMembers = [...team.members, String(invitedUser.uid)];
    const updated = await updateCloudflareTeam(env, team.id, { members: updatedMembers });
    if (!updated) {
      return NextResponse.json({ error: 'Team-Mitglieder konnten nicht in D1 aktualisiert werden' }, { status: 503 });
    }

    return NextResponse.json({ success: true, user: invitedUser, storage: 'cloudflare' });
  } catch (error) {
    console.error('[POST /api/teams/members] Invite error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mitglied konnte nicht eingeladen werden' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const result = teamMemberSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({
        error: result.error.issues[0]?.message || 'Ungültige UID',
      }, { status: 400 });
    }

    const { uid } = result.data;
    const team: any = await queryCloudflareTeamForMember(env, user.uid);
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const isOwner = team.ownerId === user.uid;
    const isAdmin = team.admins?.includes(user.uid);
    const isSelf = uid === user.uid;

    if (!isOwner && !isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (uid === team.ownerId) {
      return NextResponse.json({ error: 'Owner kann nicht aus dem Team entfernt werden' }, { status: 400 });
    }

    const updatedMembers = team.members.filter((memberId: string) => memberId !== uid);
    const updatedAdmins = (team.admins || []).filter((adminId: string) => adminId !== uid);
    const updated = await updateCloudflareTeam(env, team.id, {
      members: updatedMembers,
      admins: updatedAdmins,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Team-Mitglieder konnten nicht in D1 aktualisiert werden' }, { status: 503 });
    }

    return NextResponse.json({ success: true, storage: 'cloudflare' });
  } catch (error) {
    console.error('[DELETE /api/teams/members] Removal error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mitglied konnte nicht entfernt werden' }, { status: 500 });
  }
}

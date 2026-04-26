import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, updateDocument, queryDocuments } from '@/lib/firestore-edge';
import { teamInviteSchema, teamMemberSchema } from '@/lib/validations';

export const runtime = 'edge';

export async function POST(req: Request) {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const result = teamInviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error.issues[0]?.message || 'Ungültige E-Mail' 
      }, { status: 400 });
    }

    const { email } = result.data;
    
    // Find team where user is owner or admin
    const teams = await queryDocuments('teams', [
      { field: 'members', op: 'ARRAY_CONTAINS', value: user.uid }
    ], 'AND', token);
    
    if (!teams || teams.length === 0) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    const team = teams[0];

    // Find user by email
    const users = await queryDocuments('users', [
      { field: 'email', op: 'EQUAL', value: email }
    ], 'AND', token);

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 });
    }

    const invitedUser = users[0];
    
    if (team.members.includes(invitedUser.uid)) {
      return NextResponse.json({ error: 'Nutzer ist bereits im Team' }, { status: 400 });
    }

    const updatedMembers = [...team.members, invitedUser.uid];
    await updateDocument('teams', team.id, { members: updatedMembers }, token);
    
    return NextResponse.json({ success: true, user: invitedUser });
  } catch (error: any) {
    console.error('[POST /api/teams/members] Invite error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const result = teamMemberSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error.issues[0]?.message || 'Ungültige UID' 
      }, { status: 400 });
    }

    const { uid } = result.data;
    
    const teams = await queryDocuments('teams', [
      { field: 'members', op: 'ARRAY_CONTAINS', value: user.uid }
    ], 'AND', token);
    
    if (!teams || teams.length === 0) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    const team = teams[0];

    // Security check: Only owners or admins can remove others. Anyone can remove themselves.
    const isOwner = team.ownerId === user.uid;
    const isAdmin = team.admins?.includes(user.uid);
    const isSelf = uid === user.uid;

    if (!isOwner && !isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedMembers = team.members.filter((m: string) => m !== uid);
    const updatedAdmins = (team.admins || []).filter((a: string) => a !== uid);
    
    await updateDocument('teams', team.id, { 
      members: updatedMembers,
      admins: updatedAdmins
    }, token);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/teams/members] Removal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

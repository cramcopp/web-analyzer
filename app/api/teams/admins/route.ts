import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { updateDocument, queryDocuments } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { uid, isAdmin } = await req.json();
    
    // Find team where user is owner (only owners can change admins)
    const teams = await queryDocuments('teams', [
      { field: 'ownerId', op: 'EQUAL', value: user.uid }
    ], 'AND', token);
    
    if (!teams || teams.length === 0) return NextResponse.json({ error: 'Team not found or not owner' }, { status: 403 });
    const team = teams[0];

    let updatedAdmins = team.admins || [];
    if (isAdmin) {
      if (!updatedAdmins.includes(uid)) updatedAdmins.push(uid);
    } else {
      updatedAdmins = updatedAdmins.filter((a: string) => a !== uid);
    }
    
    await updateDocument('teams', team.id, { admins: updatedAdmins }, token);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

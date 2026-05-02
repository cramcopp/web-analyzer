import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { queryDocuments, addDocument, getDocument } from '@/lib/firestore-edge';
import { teamCreateSchema } from '@/lib/validations';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const teams = await queryDocuments('teams', [
      { field: 'members', op: 'ARRAY_CONTAINS', value: user.uid }
    ], 'AND', token);
    
    if (!teams || teams.length === 0) {
      return NextResponse.json(null);
    }

    const team = teams[0];
    
    // Fetch member details individually (avoids IN query limitations)
    const memberUids: string[] = team.members || [];
    const memberDocs = await Promise.all(
      memberUids.map((uid: string) => getDocument('users', uid, token))
    );

    const members = memberDocs
      .filter(Boolean)
      .map((m: any) => ({
        uid: m.uid,
        email: m.email,
        displayName: m.displayName
      }));

    return NextResponse.json({ team, members });
  } catch (error: any) {
    console.error('Teams Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // BIZ-11: Verify Agency Plan on Server
    const userData = await getDocument('users', user.uid, token);
    if (userData?.plan !== 'agency') {
       return NextResponse.json({ 
         error: 'Team-Funktionen sind nur im Agency-Plan verfügbar.' 
       }, { status: 403 });
    }

    const body = await req.json();
    const result = teamCreateSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error.issues[0]?.message || 'Ungültige Eingabe' 
      }, { status: 400 });
    }

    const newTeam = await addDocument('teams', {
      name: result.data.name,
      ownerId: user.uid,
      members: [user.uid],
      admins: [user.uid],
      createdAt: new Date().toISOString()
    }, token);
    
    return NextResponse.json(newTeam);
  } catch (error: any) {
    console.error('[POST /api/teams] Creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

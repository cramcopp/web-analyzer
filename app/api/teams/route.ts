import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { queryDocuments, addDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const teams = await queryDocuments('teams', [
      { field: 'ownerId', op: 'EQUAL', value: user.uid },
      { field: 'members', op: 'ARRAY_CONTAINS', value: user.uid }
    ], 'OR');
    
    // Wir nehmen das erste Team für diesen Nutzer
    return NextResponse.json(teams[0] || null);
  } catch (error: any) {
    console.error('Teams Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const newTeam = await addDocument('teams', {
      name: data.name,
      ownerId: user.uid,
      members: [user.uid],
      admins: [user.uid],
      createdAt: new Date().toISOString()
    });
    
    return NextResponse.json(newTeam);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

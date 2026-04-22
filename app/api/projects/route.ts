import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { queryDocuments, addDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // We want projects where user is owner OR a member
    const projects = await queryDocuments('projects', [
      { field: 'userId', op: 'EQUAL', value: user.uid },
      { field: 'members', op: 'ARRAY_CONTAINS', value: user.uid }
    ], 'OR');
    
    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('Projects Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const newProject = await addDocument('projects', {
      ...data,
      userId: user.uid,
      members: [user.uid],
      createdAt: new Date().toISOString()
    });
    return NextResponse.json({ id: newProject.id, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

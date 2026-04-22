import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { queryDocuments, addDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function GET() {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Firestore REST API does not support OR composite filters.
    // Run two separate queries and merge, deduplicating by ID.
    const [ownedProjects, memberProjects] = await Promise.all([
      queryDocuments('projects', [
        { field: 'userId', op: 'EQUAL', value: user.uid }
      ], 'AND', token),
      queryDocuments('projects', [
        { field: 'members', op: 'ARRAY_CONTAINS', value: user.uid }
      ], 'AND', token),
    ]);

    const seen = new Set<string>();
    const projects = [...ownedProjects, ...memberProjects].filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('Projects Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const projectData: any = {
      ...data,
      userId: user.uid,
      members: [user.uid],
      createdAt: new Date().toISOString()
    };
    if (!projectData.url) delete projectData.url;
    if (!projectData.teamId) delete projectData.teamId;

    const newProject = await addDocument('projects', projectData, token);
    return NextResponse.json({ id: newProject.id, success: true });
  } catch (error: any) {
    // Log full error for Cloudflare dashboard visibility
    console.error('[POST /api/projects] Firestore error:', JSON.stringify({
      message: error.message,
      stack: error.stack,
    }));
    return NextResponse.json({ error: error.message, detail: error.stack }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { queryDocuments, addDocument } from '@/lib/firestore-edge';
import { projectCreateSchema } from '@/lib/validations';

export const runtime = 'edge';

export async function GET() {
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Run both queries independently — if members query fails security rules, owned projects still show
    const [ownedProjects, memberProjects] = await Promise.all([
      queryDocuments('projects', [
        { field: 'userId', op: 'EQUAL', value: user.uid }
      ], 'AND', token).catch(() => [] as any[]),
      queryDocuments('projects', [
        { field: 'members', op: 'ARRAY_CONTAINS', value: user.uid }
      ], 'AND', token).catch(() => [] as any[]),
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
    const body = await req.json();
    const result = projectCreateSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error.issues[0]?.message || 'Ungültige Eingabe' 
      }, { status: 400 });
    }

    const projectData: any = {
      name: result.data.name,
      url: result.data.url || null,
      teamId: result.data.teamId || null,
      userId: user.uid,
      members: [user.uid],
      createdAt: new Date().toISOString()
    };

    const newProject = await addDocument('projects', projectData, token);
    return NextResponse.json({ id: newProject.id, success: true });
  } catch (error: any) {
    console.error('[POST /api/projects] Firestore error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

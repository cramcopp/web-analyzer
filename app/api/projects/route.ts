import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { queryDocuments, addDocument } from '@/lib/firestore-edge';
import { projectCreateSchema } from '@/lib/validations';

export const runtime = 'edge';

// FIX: req als Parameter hinzugefügt
export async function GET(req: Request) {
  // FIX: Cloudflare env extrahieren
  const env = (req as any).context?.env || process.env;

  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [ownedProjects, memberProjects] = await Promise.all([
      queryDocuments('projects', [
        { field: 'userId', op: 'EQUAL', value: user.uid }
      // FIX: env an die Datenbank übergeben!
      ], 'AND', token, env).catch((e) => { console.error(e); return [] as any[]; }),
      queryDocuments('projects', [
        { field: 'members', op: 'ARRAY_CONTAINS', value: user.uid }
      // FIX: env an die Datenbank übergeben!
      ], 'AND', token, env).catch((e) => { console.error(e); return [] as any[]; }),
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

// FIX: req als Parameter für POST beibehalten, aber env hinzufügen
export async function POST(req: Request) {
  const env = (req as any).context?.env || process.env;
  
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

    // FIX: env beim Speichern mitgeben
    const newProject = await addDocument('projects', projectData, token, env);
    return NextResponse.json({ id: newProject.id, success: true });
  } catch (error: any) {
    console.error('[POST /api/projects] Firestore error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

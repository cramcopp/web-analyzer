import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { queryDocuments, addDocument } from '@/lib/firestore-edge';
import { projectCreateSchema } from '@/lib/validations';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { queryCloudflareProjects, upsertCloudflareProject } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

// FIX: req als Parameter hinzugefügt
export async function GET(_req: Request) {
  // FIX: Cloudflare env extrahieren
  const env = getRuntimeEnv();

  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const d1Projects = await queryCloudflareProjects(env, user.uid).catch((error) => {
      console.warn('D1 projects lookup skipped:', error instanceof Error ? error.message : 'unknown');
      return [];
    });

    if (d1Projects.length > 0) {
      return NextResponse.json(d1Projects);
    }

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
  const env = getRuntimeEnv();
  
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

    const projectId = crypto.randomUUID();
    const d1Saved = await upsertCloudflareProject(env, {
      ...projectData,
      id: projectId,
    }).catch((error) => {
      console.warn('D1 project save skipped:', error instanceof Error ? error.message : 'unknown');
      return false;
    });

    // FIX: env beim Speichern mitgeben
    try {
      const newProject = await addDocument('projects', projectData, token, env);
      if (newProject?.id && d1Saved) {
        await upsertCloudflareProject(env, { ...projectData, id: newProject.id }).catch(() => false);
      }
      return NextResponse.json({ id: newProject.id, success: true });
    } catch (firestoreError) {
      if (!d1Saved) throw firestoreError;
      console.warn('[POST /api/projects] Firestore skipped during D1 transition:', firestoreError instanceof Error ? firestoreError.message : 'unknown');
      return NextResponse.json({ id: projectId, success: true, storage: 'd1' });
    }
  } catch (error: any) {
    console.error('[POST /api/projects] Firestore error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

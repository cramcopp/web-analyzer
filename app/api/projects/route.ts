import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { projectCreateSchema } from '@/lib/validations';
import { getCrawlLimit, getEffectivePlanConfig, normalizePlan } from '@/lib/plans';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { getCloudflareUserProfile, hasCloudflareD1, queryCloudflareProjects, upsertCloudflareProject } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function GET() {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  try {
    const projects = await queryCloudflareProjects(env, user.uid);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Projects Fetch Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Projekte konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const result = projectCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({
        error: result.error.issues[0]?.message || 'Ungültige Eingabe',
      }, { status: 400 });
    }

    const userData = await getCloudflareUserProfile(env, user.uid);
    const accountPlan = normalizePlan(typeof userData?.plan === 'string' ? userData.plan : 'free');
    const planConfig = getEffectivePlanConfig(accountPlan, userData?.addOns);
    const projects = await queryCloudflareProjects(env, user.uid);
    const ownedProjects = projects.filter((project: any) => project.userId === user.uid);
    if (ownedProjects.length >= planConfig.projects) {
      return NextResponse.json({
        error: 'Projektlimit erreicht',
        details: `Dein ${planConfig.name}-Plan erlaubt ${planConfig.projects} Projekte.`,
      }, { status: 403 });
    }

    const projectId = crypto.randomUUID();
    const projectData = {
      id: projectId,
      name: result.data.name,
      url: result.data.url || null,
      plan: accountPlan,
      crawlLimit: getCrawlLimit(accountPlan),
      teamId: result.data.teamId || null,
      userId: user.uid,
      members: [user.uid],
      createdAt: new Date().toISOString(),
    };

    const saved = await upsertCloudflareProject(env, projectData);
    if (!saved) {
      return NextResponse.json({ error: 'Projekt konnte nicht in D1 gespeichert werden' }, { status: 503 });
    }

    return NextResponse.json({ id: projectId, success: true, storage: 'cloudflare' });
  } catch (error) {
    console.error('[POST /api/projects] Creation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Projekt konnte nicht erstellt werden' }, { status: 500 });
  }
}

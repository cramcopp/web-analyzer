import { NextResponse } from 'next/server';
import { getSessionToken, getSessionUser } from '@/lib/auth-server';
import { queryDocuments } from '@/lib/firestore-edge';
import { getProviderAvailability, getProviderStatuses } from '@/lib/providers';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

const factCollections = {
  keywordFacts: 'keywordFacts',
  rankFacts: 'rankFacts',
  backlinkFacts: 'backlinkFacts',
  competitorFacts: 'competitorFacts',
  trafficFacts: 'trafficFacts',
  aiVisibilityFacts: 'aiVisibilityFacts',
} as const;

function getEnv() {
  return getRuntimeEnv();
}

async function loadFacts(projectId: string, userId: string, token: string, env: any) {
  const filters = [
    { field: 'userId', op: 'EQUAL', value: userId },
    { field: 'projectId', op: 'EQUAL', value: projectId },
  ];

  const [keywordFacts, rankFacts, backlinkFacts, competitorFacts, trafficFacts, aiVisibilityFacts] = await Promise.all([
    queryDocuments(factCollections.keywordFacts, filters, 'AND', token, env).catch(() => []),
    queryDocuments(factCollections.rankFacts, filters, 'AND', token, env).catch(() => []),
    queryDocuments(factCollections.backlinkFacts, filters, 'AND', token, env).catch(() => []),
    queryDocuments(factCollections.competitorFacts, filters, 'AND', token, env).catch(() => []),
    queryDocuments(factCollections.trafficFacts, filters, 'AND', token, env).catch(() => []),
    queryDocuments(factCollections.aiVisibilityFacts, filters, 'AND', token, env).catch(() => []),
  ]);

  return { keywordFacts, rankFacts, backlinkFacts, competitorFacts, trafficFacts, aiVisibilityFacts };
}

export async function GET(req: Request) {
  const env = getEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  try {
    const availability = getProviderAvailability(env);
    const providers = getProviderStatuses(env);
    const facts = projectId ? await loadFacts(projectId, user.uid, token, env) : null;

    return NextResponse.json({
      availability,
      providers,
      facts,
      note: 'Provider API gibt nur konfigurierte Provider und gespeicherte Facts zurueck. Es werden keine Werte simuliert.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Provider Status konnte nicht geladen werden' }, { status: 500 });
  }
}

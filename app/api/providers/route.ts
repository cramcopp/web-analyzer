import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getProviderAvailability, getProviderStatuses } from '@/lib/providers';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { hasCloudflareD1, queryCloudflareProviderFacts } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  try {
    const availability = getProviderAvailability(env);
    const providers = getProviderStatuses(env);
    const facts = projectId && hasCloudflareD1(env)
      ? await queryCloudflareProviderFacts(env, { projectId, userId: user.uid })
      : null;

    return NextResponse.json({
      availability,
      providers,
      facts,
      note: 'Provider API gibt nur konfigurierte Provider und gespeicherte D1-Facts zurueck. Es werden keine Werte simuliert.',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Provider Status konnte nicht geladen werden' }, { status: 500 });
  }
}

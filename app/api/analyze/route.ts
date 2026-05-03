import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getMonthlyScanLimit, normalizePlan } from '@/lib/plans';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import {
  createCloudflareScanPlaceholder,
  defaultUserProfile,
  getCloudflareUserProfile,
  incrementCloudflareUserScanCount,
  storeCloudflareScanArtifacts,
  upsertCloudflareUserProfile,
  writeCloudflareScanResult,
} from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unbekannter Fehler';
}

async function readAnalyzeBody(req: Request) {
  try {
    const body = await req.json();
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    const projectId = typeof body?.projectId === 'string' ? body.projectId : undefined;

    if (!url) {
      return { error: 'URL ist erforderlich' };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { error: 'Ungueltige URL' };
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { error: 'Nur HTTP- und HTTPS-URLs koennen analysiert werden' };
    }

    return { url: parsedUrl.toString(), projectId };
  } catch {
    return { error: 'Ungueltiges JSON im Request Body' };
  }
}

export async function POST(req: Request) {
  try {
    const env = getRuntimeEnv();
    const body = await readAnalyzeBody(req);
    if ('error' in body) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const { url, projectId } = body;
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    let userData: any = await getCloudflareUserProfile(env, user.uid).catch((error) => {
      console.warn('D1 user lookup failed:', getErrorMessage(error));
      return null;
    });

    if (!userData) {
      userData = defaultUserProfile(user);
      const synced = await upsertCloudflareUserProfile(env, user, userData).catch((error) => {
        console.warn('D1 user sync failed:', getErrorMessage(error));
        return false;
      });

      if (!synced) {
        return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfuegbar' }, { status: 503 });
      }
    }

    const plan = normalizePlan(userData?.plan || 'free');
    const scanCount = userData?.scanCount || 0;
    const maxScans = getMonthlyScanLimit(plan);

    if (scanCount >= maxScans) {
      return NextResponse.json({
        error: 'Scan-Limit erreicht',
        details: `Du hast ${scanCount}/${maxScans} Scans verbraucht. Bitte upgrade deinen Plan.`,
      }, { status: 403 });
    }

    const d1CounterUpdated = await incrementCloudflareUserScanCount(env, user, 1).catch((counterError) => {
      console.warn('D1 scan counter update failed:', getErrorMessage(counterError));
      return false;
    });

    if (!d1CounterUpdated) {
      return NextResponse.json({ error: 'Scan-Counter konnte nicht in D1 aktualisiert werden' }, { status: 503 });
    }

    const audit_id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const d1PlaceholderCreated = await createCloudflareScanPlaceholder(env, {
      id: audit_id,
      userId: user.uid,
      projectId,
      url,
      plan,
      status: 'scanning',
      progress: 0,
      createdAt,
    }).catch((placeholderError) => {
      console.warn('D1 scan placeholder failed:', getErrorMessage(placeholderError));
      return false;
    });

    if (!d1PlaceholderCreated) {
      return NextResponse.json({ error: 'Scan konnte nicht in D1 vorbereitet werden' }, { status: 503 });
    }

    if (env.SCAN_WORKFLOW_SERVICE) {
      const workflowResponse = await env.SCAN_WORKFLOW_SERVICE.fetch(new Request('https://worker/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          plan,
          userId: user.uid,
          projectId,
          auditId: audit_id,
        }),
      }));

      if (!workflowResponse.ok) {
        const workflowError = await workflowResponse.text().catch(() => '');
        throw new Error(`Workflow konnte nicht gestartet werden (${workflowResponse.status}). ${workflowError}`.trim());
      }

      return NextResponse.json({
        audit_id,
        mode: 'workflow',
        status: 'processing',
      });
    }

    console.warn('Workflow nicht gebunden. Nutze langsamen Direct-Scan.');
    const { performAnalysis } = await import('@/lib/scanner');

    void performAnalysis({ url, plan, userId: user.uid, projectId, auditId: audit_id, env }).then(async (result) => {
      const storedResult = await storeCloudflareScanArtifacts(env, result, { scanId: audit_id, userId: user.uid });
      await writeCloudflareScanResult(env, storedResult, { scanId: audit_id, userId: user.uid, projectId, plan })
        .catch((storageError) => console.warn('D1/R2 scan write failed:', getErrorMessage(storageError)));
    }).catch(console.error);

    return NextResponse.json({
      audit_id,
      mode: 'background-direct',
      status: 'processing',
    });
  } catch (error) {
    console.error('Analyze API Error:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler', details: getErrorMessage(error) }, { status: 500 });
  }
}

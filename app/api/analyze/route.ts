import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import {
  getEffectiveCrawlLimit,
  getMonthlyCrawlPageLimit,
  getMonthlyScanLimit,
  getVisibilityLimits,
  normalizePlan,
} from '@/lib/plans';
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
    const device: 'desktop' | 'mobile' = body?.device === 'mobile' ? 'mobile' : 'desktop';
    const renderMode: 'fetch' | 'browser' | 'auto' = body?.renderMode === 'browser' || body?.renderMode === 'fetch' ? body.renderMode : 'auto';

    if (!url) {
      return { error: 'URL ist erforderlich' };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { error: 'Ungültige URL' };
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { error: 'Nur HTTP- und HTTPS-URLs können analysiert werden' };
    }

    return { url: parsedUrl.toString(), projectId, device, renderMode };
  } catch {
    return { error: 'Ungültiges JSON im Request Body' };
  }
}

export async function POST(req: Request) {
  try {
    const env = getRuntimeEnv();
    const body = await readAnalyzeBody(req);
    if ('error' in body) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const { url, projectId, device, renderMode } = body;
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
        return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
      }
    }

    const plan = normalizePlan(userData?.plan || 'free');
    const scanCount = userData?.scanCount || 0;
    const maxScans = getMonthlyScanLimit(plan);
    const crawlPagesCount = userData?.crawlPagesCount || 0;
    const maxCrawlPages = getMonthlyCrawlPageLimit(plan);
    const remainingCrawlPages = Math.max(maxCrawlPages - crawlPagesCount, 0);
    const crawlLimitUsed = getEffectiveCrawlLimit(plan, remainingCrawlPages);
    const visibilityLimits = getVisibilityLimits(plan);

    if (scanCount >= maxScans) {
      return NextResponse.json({
        error: 'Scan-Limit erreicht',
        details: `Du hast ${scanCount}/${maxScans} Scans verbraucht. Bitte upgrade deinen Plan.`,
      }, { status: 403 });
    }

    if (remainingCrawlPages <= 0 || crawlLimitUsed <= 0) {
      return NextResponse.json({
        error: 'Crawl-Seiten-Limit erreicht',
        details: `Du hast ${crawlPagesCount}/${maxCrawlPages} Crawl-Seiten verbraucht. Bitte upgrade deinen Plan.`,
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
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': env.INTERNAL_SECRET || '',
        },
        body: JSON.stringify({
          url,
          plan,
          userId: user.uid,
          projectId,
          auditId: audit_id,
          device,
          renderMode,
          crawlLimitOverride: crawlLimitUsed,
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
        plan,
        accountPlan: plan,
        scanPlan: plan,
        crawlLimitUsed,
        monthlyCrawlPagesUsed: crawlPagesCount,
        monthlyCrawlPagesLimit: maxCrawlPages,
        visibilityLimits,
        crawlDevice: device,
        renderMode,
      });
    }

    console.warn('Workflow nicht gebunden. Nutze langsamen Direct-Scan.');
    const { performAnalysis } = await import('@/lib/scanner');

    void performAnalysis({ url, plan, userId: user.uid, projectId, auditId: audit_id, device, renderMode, crawlLimitOverride: crawlLimitUsed, env }).then(async (result) => {
      const storedResult = await storeCloudflareScanArtifacts(env, result, { scanId: audit_id, userId: user.uid });
      await writeCloudflareScanResult(env, storedResult, { scanId: audit_id, userId: user.uid, projectId, plan })
        .catch((storageError) => console.warn('D1/R2 scan write failed:', getErrorMessage(storageError)));
    }).catch(console.error);

    return NextResponse.json({
      audit_id,
      mode: 'background-direct',
      status: 'processing',
      plan,
      accountPlan: plan,
      scanPlan: plan,
      crawlLimitUsed,
      monthlyCrawlPagesUsed: crawlPagesCount,
      monthlyCrawlPagesLimit: maxCrawlPages,
      visibilityLimits,
      crawlDevice: device,
      renderMode,
    });
  } catch (error) {
    console.error('Analyze API Error:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler', details: getErrorMessage(error) }, { status: 500 });
  }
}

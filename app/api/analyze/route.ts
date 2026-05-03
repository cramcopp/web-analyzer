import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, incrementField } from '@/lib/firestore-edge';
import { getMonthlyScanLimit, normalizePlan } from '@/lib/plans';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { canUseFirestoreAdmin, createServerDocumentWithId, setServerDocument } from '@/lib/server-firestore';
import { toStoredReportDocument } from '@/lib/report-storage';
import {
  createCloudflareScanPlaceholder,
  getCloudflareUserProfile,
  hasCloudflareD1,
  incrementCloudflareUserScanCount,
  storeCloudflareScanArtifacts,
  upsertCloudflareUserProfile,
  writeCloudflareScanResult,
} from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

// FIX: Wir übergeben req an getEnv, um die Cloudflare-Variablen zu greifen!
const getEnv = getRuntimeEnv;

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
      return { error: 'Ungültige URL' };
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { error: 'Nur HTTP- und HTTPS-URLs können analysiert werden' };
    }

    return { url: parsedUrl.toString(), projectId };
  } catch {
    return { error: 'Ungültiges JSON im Request Body' };
  }
}

export async function POST(req: Request) {
  try {
    // FIX: req übergeben
    const env = getEnv();
    const body = await readAnalyzeBody(req);
    if ('error' in body) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const { url, projectId } = body;
    const token = await getSessionToken();
    const user = await getSessionUser();

    if (!user || !token) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    // 1. Check Quota & Plan
    const cloudflareUserData = await getCloudflareUserProfile(env, user.uid).catch((error) => {
      console.warn('D1 user lookup skipped:', getErrorMessage(error));
      return null;
    });
    if (!cloudflareUserData && hasCloudflareD1(env)) {
      await upsertCloudflareUserProfile(env, user).catch((error) => {
        console.warn('D1 user sync skipped:', getErrorMessage(error));
      });
    }

    const userData = (cloudflareUserData || await getDocument('users', user.uid, token, env)) as any;
    const plan = normalizePlan(userData?.plan || 'free');
    const scanCount = userData?.scanCount || 0;
    const maxScans = getMonthlyScanLimit(plan);

    if (scanCount >= maxScans) {
      return NextResponse.json({ 
        error: 'Scan-Limit erreicht', 
        details: `Du hast ${scanCount}/${maxScans} Scans verbraucht. Bitte upgrade deinen Plan.` 
      }, { status: 403 });
    }

    // 2. Counter hochzählen
    const d1CounterUpdated = await incrementCloudflareUserScanCount(env, user, 1).catch((counterError) => {
      console.warn('D1 scan counter update skipped:', getErrorMessage(counterError));
      return false;
    });

    if (!d1CounterUpdated) {
      try {
        await incrementField('users', user.uid, 'scanCount', 1, token, env);
      } catch (counterError) {
        console.warn('Scan counter update skipped:', getErrorMessage(counterError));
      }
    }

    // 3. Setup Audit Placeholder
    const audit_id = crypto.randomUUID();
    const placeholderReport: Record<string, any> = {
      audit_id,
      userId: user.uid,
      url,
      urlObj: url,
      createdAt: new Date().toISOString(),
      status: 'scanning',
      progress: 0,
    };
    
    if (projectId) {
      placeholderReport.projectId = projectId;
    }

    const d1PlaceholderCreated = await createCloudflareScanPlaceholder(env, {
      id: audit_id,
      userId: user.uid,
      projectId,
      url,
      plan,
      status: 'scanning',
      progress: 0,
      createdAt: placeholderReport.createdAt,
    }).catch((placeholderError) => {
      console.warn('D1 scan placeholder skipped:', getErrorMessage(placeholderError));
      return false;
    });

    try {
      await createServerDocumentWithId('reports', audit_id, placeholderReport, token, env);
    } catch (placeholderError) {
      if (!d1PlaceholderCreated) throw placeholderError;
      console.warn('Firestore scan placeholder skipped during D1 transition:', getErrorMessage(placeholderError));
    }

    // 4. TRIGGER CLOUDFLARE WORKFLOW
    if (env.SCAN_WORKFLOW_SERVICE) {
      const workflowResponse = await env.SCAN_WORKFLOW_SERVICE.fetch(new Request("https://worker/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url, 
          plan, 
          userId: user.uid,
          projectId,
          token: canUseFirestoreAdmin(env) ? undefined : token,
          auditId: audit_id
        })
      }));

      if (!workflowResponse.ok) {
        const workflowError = await workflowResponse.text().catch(() => '');
        throw new Error(`Workflow konnte nicht gestartet werden (${workflowResponse.status}). ${workflowError}`.trim());
      }
      
      return NextResponse.json({ 
        audit_id,
        mode: 'workflow',
        status: 'processing'
      });
    } else {
      console.warn("Achtung: Workflow nicht gebunden! Nutze langsamen Direct-Scan.");
      const { performAnalysis } = await import('@/lib/scanner');
      
      void performAnalysis({ url, plan, userId: user.uid, projectId, auditId: audit_id, env }).then(async (result) => {
        const storedResult = await storeCloudflareScanArtifacts(env, result, { scanId: audit_id, userId: user.uid });
        await writeCloudflareScanResult(env, storedResult, { scanId: audit_id, userId: user.uid, projectId, plan })
          .catch((storageError) => console.warn('D1/R2 scan write skipped:', getErrorMessage(storageError)));
        const reportDocument = toStoredReportDocument(storedResult, audit_id, user.uid, projectId);
        await setServerDocument('reports', audit_id, reportDocument, Object.keys(reportDocument), token, env)
          .catch((firestoreError) => console.warn('Firestore direct report write skipped:', getErrorMessage(firestoreError)));
      }).catch(console.error);

      return NextResponse.json({ 
        audit_id,
        mode: 'background-direct',
        status: 'processing'
      });
    }

  } catch (error: any) {
    console.error('Analyze API Error:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler', details: getErrorMessage(error) }, { status: 500 });
  }
}

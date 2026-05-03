import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, setDocument, incrementField } from '@/lib/firestore-edge';
import { getMonthlyScanLimit, normalizePlan } from '@/lib/plans';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

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
    const userData = await getDocument('users', user.uid, token, env);
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
    try {
      await incrementField('users', user.uid, 'scanCount', 1, token, env);
    } catch (counterError) {
      console.warn('Scan counter update skipped:', getErrorMessage(counterError));
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

    await setDocument('reports', audit_id, placeholderReport, null, token, env);

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
        await setDocument('reports', audit_id, {
          ...result,
          audit_id,
          userId: user.uid,
          projectId,
          status: 'completed',
          progress: 100,
          adminSecret: env.INTERNAL_SECRET
        }, null, null, env);
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

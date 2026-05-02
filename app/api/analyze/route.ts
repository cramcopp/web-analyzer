import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, setDocument, incrementField } from '@/lib/firestore-edge';
import { getMonthlyScanLimit, normalizePlan } from '@/lib/plans';

export const runtime = 'nodejs';

// FIX: Wir übergeben req an getEnv, um die Cloudflare-Variablen zu greifen!
const getEnv = (req: Request) => {
  const cfEnv = (req as any).context?.env || process.env;
  
  return {
    INTERNAL_SECRET: cfEnv.INTERNAL_SECRET,
    SCAN_WORKFLOW_SERVICE: cfEnv.SCAN_WORKFLOW_SERVICE, 
    FIREBASE_PROJECT_ID: cfEnv.FIREBASE_PROJECT_ID,
    FIREBASE_API_KEY: cfEnv.FIREBASE_API_KEY,
    FIREBASE_DATABASE_ID: cfEnv.FIREBASE_DATABASE_ID || '(default)'
  };
};

export async function POST(req: Request) {
  try {
    // FIX: req übergeben
    const env = getEnv(req);
    const { url } = await req.json(); // req.json() statt request.json()
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
    await incrementField('users', user.uid, 'scanCount', 1, token, env);

    // 3. Setup Audit Placeholder
    const audit_id = crypto.randomUUID();
    
    await setDocument('reports', audit_id, {
      audit_id,
      userId: user.uid,
      url: url,
      urlObj: url,
      createdAt: new Date().toISOString(),
      status: 'scanning',
      progress: 0,
      planUsed: plan,
      adminSecret: env.INTERNAL_SECRET
    }, null, null, env);

    // 4. TRIGGER CLOUDFLARE WORKFLOW
    if (env.SCAN_WORKFLOW_SERVICE) {
      // FIX: Wir kommunizieren über fetch() mit dem Service-Binding!
      await env.SCAN_WORKFLOW_SERVICE.fetch(new Request("https://worker/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url, 
          plan, 
          userId: user.uid,
          token,
          auditId: audit_id
        })
      }));
      
      return NextResponse.json({ 
        audit_id,
        mode: 'workflow',
        status: 'processing'
      });
    } else {
      console.warn("Achtung: Workflow nicht gebunden! Nutze langsamen Direct-Scan.");
      const { performAnalysis } = await import('@/lib/scanner');
      
      performAnalysis({ url, plan, userId: user.uid, auditId: audit_id }).then(async (result) => {
        await setDocument('reports', audit_id, {
          ...result,
          audit_id,
          userId: user.uid,
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
    return NextResponse.json({ error: 'Interner Server-Fehler', details: error.message }, { status: 500 });
  }
}

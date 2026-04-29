import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
// FIX 1: incrementField importieren!
import { getDocument, setDocument, incrementField } from '@/lib/firestore-edge';

export const runtime = 'edge';

const getEnv = () => {
  return {
    INTERNAL_SECRET: process.env.INTERNAL_SECRET,
    // FIX 2: Richtiger Name für das Workflow-Binding
    SCAN_WORKFLOW: (process.env as any).SCAN_WORKFLOW,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_DATABASE_ID: process.env.FIREBASE_DATABASE_ID || '(default)'
  };
};

export async function POST(request: Request) {
  try {
    const env = getEnv();
    const { url } = await request.json();
    const token = await getSessionToken();
    const user = await getSessionUser();

    if (!user || !token) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    // 1. Check Quota & Plan
    const userData = await getDocument('users', user.uid, token, env);
    
    // HINWEIS: Falls dein Plan in Stripe unter "subscription.plan" gespeichert ist,
    // musst du das hier zu userData?.subscription?.plan ändern!
    const plan = (userData?.plan || 'free').toLowerCase();
    const scanCount = userData?.scanCount || 0;
    const maxScans = userData?.maxScans || (plan === 'agency' ? 500 : plan === 'pro' ? 50 : 5);

    if (scanCount >= maxScans) {
      return NextResponse.json({ 
        error: 'Scan-Limit erreicht', 
        details: `Du hast ${scanCount}/${maxScans} Scans verbraucht. Bitte upgrade deinen Plan.` 
      }, { status: 403 });
    }

    // FIX 3: Den Counter in Firestore VOR dem Scan hochzählen!
    await incrementField('users', user.uid, 'scanCount', 1, token, env);

    // 2. Setup Audit Placeholder
    const audit_id = Math.random().toString(36).substring(7).toUpperCase();
    
    await setDocument('reports', audit_id, {
      audit_id,
      userId: user.uid,
      url: url,
      urlObj: url,
      createdAt: new Date().toISOString(),
      status: 'scanning',
      progress: 0,
      planUsed: plan, // Zur Kontrolle mit abspeichern
      adminSecret: env.INTERNAL_SECRET
    }, null, null, env);

    // 3. TRIGGER CLOUDFLARE WORKFLOW
    if (env.SCAN_WORKFLOW) {
      // FIX 4: Cloudflare Workflows MÜSSEN mit .create({ params: {...} }) gestartet werden
      await env.SCAN_WORKFLOW.create({ 
        params: {
          url, 
          plan, 
          userId: user.uid,
          token,
          auditId: audit_id
        }
      });
      
      return NextResponse.json({ 
        audit_id,
        mode: 'workflow',
        status: 'processing'
      });
    } else {
      // Notfall-Fallback, falls lokal kein Workflow verbunden ist
      console.warn("Achtung: Workflow nicht gebunden! Nutze langsamen Direct-Scan.");
      const { performAnalysis } = await import('@/lib/scanner');
      
      // Starte Scan im Hintergrund (ohne await), damit die API direkt antwortet
      performAnalysis({ url, plan }).then(async (result) => {
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

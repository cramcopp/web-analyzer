import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, setDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

// Helper to get environment variables in Edge runtime
const getEnv = () => {
  return {
    INTERNAL_SECRET: process.env.INTERNAL_SECRET,
    SCAN_WORKFLOW_SERVICE: (process.env as any).SCAN_WORKFLOW_SERVICE,
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

    // 1. Check Quota
    const userData = await getDocument('users', user.uid, token, env);
    const plan = (userData?.plan || 'free').toLowerCase();
    const scanCount = userData?.scanCount || 0;
    const maxScans = userData?.maxScans || (plan === 'agency' ? 100 : plan === 'pro' ? 25 : 5);

    if (scanCount >= maxScans) {
      return NextResponse.json({ 
        error: 'Scan-Limit erreicht', 
        details: `Du hast ${scanCount}/${maxScans} Scans verbraucht. Bitte upgrade deinen Plan.` 
      }, { status: 403 });
    }

    // 2. Normalize & Setup Audit
    const audit_id = Math.random().toString(36).substring(7).toUpperCase();
    
    // Create Placeholder in Firestore
    await setDocument('reports', audit_id, {
      audit_id,
      userId: user.uid,
      url: url,
      urlObj: url,
      createdAt: new Date().toISOString(),
      status: 'scanning',
      progress: 0,
      adminSecret: env.INTERNAL_SECRET
    }, null, null, env);

    // 3. TRIGGER SCAN
    try {
      // Direct Scan for small sites to avoid workflow delays
      const { performAnalysis } = await import('@/lib/scanner');
      const result = await performAnalysis({ url, plan, userId: user.uid, auditId: audit_id });
      
      // Save the real result immediately
      await setDocument('reports', audit_id, {
        ...result,
        audit_id,
        userId: user.uid,
        url: url,
        urlObj: url,
        status: 'completed',
        progress: 100,
        adminSecret: env.INTERNAL_SECRET
      }, null, null, env);

      return NextResponse.json({ 
        ...result,
        audit_id,
        mode: 'direct',
        status: 'completed'
      });
    } catch (e: any) {
      console.error("Direct scan failed, trying workflow:", e);
      
      // Fallback to workflow if direct scan fails or times out
      if (env.SCAN_WORKFLOW_SERVICE) {
        // Cloudflare Workflow Service Binding call
        await env.SCAN_WORKFLOW_SERVICE.startScan({ 
          url, 
          plan, 
          userId: user.uid,
          token,
          auditId: audit_id
        });
        
        return NextResponse.json({ 
          audit_id,
          mode: 'workflow',
          status: 'processing'
        });
      }
      
      return NextResponse.json({ 
        error: 'Analyse fehlgeschlagen.', 
        details: e.message 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Analyze API Error:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler', details: error.message }, { status: 500 });
  }
}

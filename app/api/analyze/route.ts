import { NextResponse } from 'next/server';
import { performAnalysis } from '@/lib/scanner';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, queryDocuments } from '@/lib/firestore-edge';
import { analyzeSchema } from '@/lib/validations';
import { PLAN_CONFIG } from '@/lib/stripe';

export const runtime = 'edge';

export async function POST(req: Request) {
  const user = await getSessionUser();
  const token = await getSessionToken();

  if (!user || !token) {
    return NextResponse.json({ error: 'Bitte melde dich an, um den Scanner zu nutzen.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = analyzeSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error.issues[0]?.message || 'Ungültige Eingabe' 
      }, { status: 400 });
    }

    let { url } = result.data;
    const { apiKey } = result.data;

    // URL Sanitization & Protocol Enforcement
    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const urlObj = new URL(url);
      url = urlObj.origin + urlObj.pathname;
    } catch (e) {
      return NextResponse.json({ error: 'Ungültiges URL-Format' }, { status: 400 });
    }

    // --- 10-Minute Scan Cache ---
    if (user && token) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const recentReports = await queryDocuments('reports', [
        { field: 'userId', op: 'EQUAL', value: user.uid },
        { field: 'url', op: 'EQUAL', value: url },
        { field: 'createdAt', op: 'GREATER_THAN', value: tenMinutesAgo }
      ], 'AND', token);

      if (recentReports && recentReports.length > 0) {
        const latest = recentReports[0];
        // If it has results and rawScrapeData, return them directly
        if (latest.results && latest.rawScrapeData) {
          return NextResponse.json({
            ...JSON.parse(latest.rawScrapeData),
            _cached: true,
            _cachedReport: JSON.parse(latest.results)
          });
        }
      }
    }

    // BIZ-01: Server-side quota check
    let effectivePlan = 'free';
    if (user && token) {
      const userData = await getDocument('users', user.uid, token);
      if (userData) {
        effectivePlan = userData.plan || 'free';
        const scanCount = userData.scanCount || 0;
        const maxScans = userData.maxScans || PLAN_CONFIG.free.maxScans;

        if (scanCount >= maxScans) {
          return NextResponse.json({ 
            error: 'Scan-Limit erreicht', 
            details: `Du hast ${scanCount} von ${maxScans} Scans verbraucht. Bitte upgrade dein Abo.` 
          }, { status: 403 });
        }
      }
    } else {
       // BIZ-01: Block unauthenticated scans to prevent cost explosion
       return NextResponse.json({ error: 'Bitte logge dich ein, um eine Analyse zu starten.' }, { status: 401 });
    }

    const scanResult = await performAnalysis({ url, plan: effectivePlan });

    return NextResponse.json(scanResult);

  } catch (error: any) {
    console.error("API Analysis Error:", error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: error.message || 'Server error occurred during analysis.' }, { status: 500 });
  }
}

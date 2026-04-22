import { NextResponse } from 'next/server';
import { performAnalysis } from '@/lib/scanner';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, queryDocuments } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function POST(req: Request) {
  const user = await getSessionUser();
  const token = await getSessionToken();

  try {
    const body = await req.json();
    let url = body.url;
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // URL Sanitization & Protocol Enforcement
    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const urlObj = new URL(url);
      url = urlObj.origin + urlObj.pathname; // Remove hashes/query params for scan
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

    // Determine real plan from Firestore to prevent tampering
    let effectivePlan = 'free';
    if (user && token) {
      const userData = await getDocument('users', user.uid, token);
      if (userData?.plan) {
        effectivePlan = userData.plan;
      }
    }

    const scanResult = await performAnalysis({ url, plan: effectivePlan });
    return NextResponse.json(scanResult);

  } catch (error: any) {
    console.error("API Analysis Error:", error);
    return NextResponse.json({ error: error.message || 'Server error occurred during analysis.' }, { status: 500 });
  }
}

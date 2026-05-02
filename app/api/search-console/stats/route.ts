import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, updateDocument, fetchWithRetry } from '@/lib/firestore-edge';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const siteUrl = searchParams.get('url');

  if (!siteUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const user = await getSessionUser();
  const token = await getSessionToken();

  if (!user || !token) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const userData = await getDocument('users', user.uid, token);
    const tokensRaw = userData?.gscTokens;

    if (!tokensRaw) {
      return NextResponse.json({ error: 'Search Console nicht verbunden' }, { status: 401 });
    }

    let tokens = JSON.parse(tokensRaw);
    let accessToken = tokens.access_token;

    // Helper for API calls with automatic refresh
    const googleFetch = async (url: string, options: any = {}, isRetry = false): Promise<any> => {
      const res = await fetchWithRetry(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        if (res.status === 401 && !isRetry && tokens.refresh_token) {
          console.warn('Google Access Token expired, attempting refresh...');
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID || '',
              client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
              refresh_token: tokens.refresh_token,
              grant_type: 'refresh_token',
            })
          });

          if (refreshRes.ok) {
            const newTokens = await refreshRes.json();
            tokens = { ...tokens, ...newTokens };
            accessToken = tokens.access_token;

            // Save updated tokens back to Firestore
            await updateDocument('users', user.uid, {
              gscTokens: JSON.stringify(tokens),
              adminSecret: process.env.INTERNAL_SECRET
            }, token);

            // Retry the original request
            return googleFetch(url, options, true);
          }
        }

        const err = await res.json().catch(() => ({ error: 'Unknown Error' }));
        console.error(`Google API Error (${url}):`, err);
        if (res.status === 401) throw new Error('AUTH_EXPIRED');
        throw new Error(err.error?.message || err.error || 'API Request Failed');
      }
      return res.json();
    };

    // 1. Find the property (Search Console Sites)
    const siteListData = await googleFetch('https://www.googleapis.com/webmasters/v3/sites');

    const sites = siteListData.siteEntry || [];
    
    // Simple matching: find a site that is a prefix of the provided URL or matches the domain
    const matchedSite = sites.find((s: any) => siteUrl.startsWith(s.siteUrl || '')) || sites[0]; 

    if (!matchedSite || !matchedSite.siteUrl) {
      return NextResponse.json({ error: 'Keine passende Search Console Property gefunden.' }, { status: 404 });
    }

    const targetProperty = matchedSite.siteUrl;
    const encodedProperty = encodeURIComponent(targetProperty);

    // 2. Fetch Performance Data (Last 30 days)
    // API: https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const performanceResponse = await googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedProperty}/searchAnalytics/query`, {
      method: 'POST',
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['date'],
        rowLimit: 31
      })
    });

    const performanceData = performanceResponse.rows || [];
    const performanceTotals = performanceData.reduce((acc: any, row: any) => ({
      clicks: acc.clicks + (row.clicks || 0),
      impressions: acc.impressions + (row.impressions || 0)
    }), { clicks: 0, impressions: 0 });

    // 3. Inspect the specific URL (Requires URL Inspection API)
    // API: https://searchconsole.googleapis.com/v1/urlInspection/index:inspect
    let inspectionResult = null;
    try {
      const inspectRes = await googleFetch(`https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`, {
        method: 'POST',
        body: JSON.stringify({
          inspectionUrl: siteUrl,
          siteUrl: targetProperty
        })
      });
      inspectionResult = inspectRes.inspectionResult;
    } catch (e) {
      console.warn("URL Inspection API failed (common for non-owner or restricted accounts):", e);
    }

    // 4. Get Sitemaps
    // API: https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/sitemaps
    const sitemapsRes = await googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedProperty}/sitemaps`);

    return NextResponse.json({
      property: targetProperty,
      performance: performanceData,
      performanceTotals,
      inspection: inspectionResult,
      sitemaps: sitemapsRes.sitemap || []
    });

  } catch (error: any) {
    console.error('Search Console API Error:', error);
    if (error.message === 'AUTH_EXPIRED') {
       return NextResponse.json({ error: 'Session abgelaufen. Bitte erneut verbinden.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Fehler beim Abrufen der Search Console Daten.' }, { status: 500 });
  }
}

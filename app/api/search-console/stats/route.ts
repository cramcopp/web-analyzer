import { NextResponse } from 'next/server';

export const runtime = 'edge';

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const [key, ...val] = part.trim().split('=');
    if (key) cookies[key.trim()] = decodeURIComponent(val.join('='));
  }
  return cookies;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const siteUrl = searchParams.get('url');

  if (!siteUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const cookies = parseCookies(req.headers.get('cookie'));
  const tokensCookieRaw = cookies['gsc_tokens'];

  if (!tokensCookieRaw) {
    return NextResponse.json({ error: 'User not authenticated with Google' }, { status: 401 });
  }

  try {
    const tokens = JSON.parse(tokensCookieRaw);
    const accessToken = tokens.access_token;

    if (!accessToken) {
       throw new Error('Access token missing in session');
    }

    // Helper for API calls
    const googleFetch = async (url: string, options: any = {}) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown Error' }));
        console.error(`Google API Error (${url}):`, err);
        if (res.status === 401) throw new Error('AUTH_EXPIRED');
        throw new Error(err.error?.message || err.error || 'API Request Failed');
      }
      return res.json();
    };

    // 1. Find the property (Search Console Sites)
    // API: https://www.googleapis.com/webmasters/v3/sites
    const siteListData = await googleFetch('https://www.googleapis.com/webmasters/v3/sites');
    const sites = siteListData.siteEntry || [];
    
    // Simple matching: find a site that is a prefix of the provided URL or matches the domain
    const matchedSite = sites.find((s: any) => siteUrl.startsWith(s.siteUrl || '')) || sites[0]; 

    if (!matchedSite) {
      return NextResponse.json({ error: 'Keine passende Search Console Property gefunden.' }, { status: 404 });
    }

    const targetProperty = matchedSite.siteUrl!;
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

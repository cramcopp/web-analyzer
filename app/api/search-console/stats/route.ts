import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { fetchWithRetry } from '@/lib/http';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { getCloudflareUserProfile, hasCloudflareD1, patchCloudflareUserProfile } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const env = getRuntimeEnv();
  const { searchParams } = new URL(req.url);
  const siteUrl = searchParams.get('url');

  if (!siteUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  if (!hasCloudflareD1(env)) {
    return NextResponse.json({ error: 'Cloudflare D1 ist nicht verfügbar' }, { status: 503 });
  }

  try {
    const userData = await getCloudflareUserProfile(env, user.uid);
    const tokensRaw = userData?.gscTokens;

    if (!tokensRaw) {
      return NextResponse.json({ error: 'Search Console nicht verbunden' }, { status: 401 });
    }

    let tokens = typeof tokensRaw === 'string' ? JSON.parse(tokensRaw) : tokensRaw;
    let accessToken = tokens.access_token;

    const googleFetch = async (url: string, options: RequestInit = {}, isRetry = false): Promise<any> => {
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);
      headers.set('Content-Type', 'application/json');

      const res = await fetchWithRetry(url, {
        ...options,
        headers,
      });

      if (!res.ok) {
        if (res.status === 401 && !isRetry && tokens.refresh_token) {
          console.warn('Google Access Token expired, attempting refresh...');
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: env.GOOGLE_CLIENT_ID || '',
              client_secret: env.GOOGLE_CLIENT_SECRET || '',
              refresh_token: tokens.refresh_token,
              grant_type: 'refresh_token',
            }),
          });

          if (refreshRes.ok) {
            const newTokens = await refreshRes.json();
            tokens = { ...tokens, ...newTokens };
            accessToken = tokens.access_token;

            await patchCloudflareUserProfile(env, user.uid, {
              gscTokens: JSON.stringify(tokens),
            });

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

    const siteListData = await googleFetch('https://www.googleapis.com/webmasters/v3/sites');
    const sites = siteListData.siteEntry || [];
    const matchedSite = sites.find((site: any) => siteUrl.startsWith(site.siteUrl || '')) || sites[0];

    if (!matchedSite?.siteUrl) {
      return NextResponse.json({ error: 'Keine passende Search Console Property gefunden.' }, { status: 404 });
    }

    const targetProperty = matchedSite.siteUrl;
    const encodedProperty = encodeURIComponent(targetProperty);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const performanceResponse = await googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedProperty}/searchAnalytics/query`, {
      method: 'POST',
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['date'],
        rowLimit: 31,
      }),
    });

    const performanceData = performanceResponse.rows || [];
    const performanceTotals = performanceData.reduce((acc: any, row: any) => ({
      clicks: acc.clicks + (row.clicks || 0),
      impressions: acc.impressions + (row.impressions || 0),
    }), { clicks: 0, impressions: 0 });

    let inspectionResult = null;
    try {
      const inspectRes = await googleFetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        body: JSON.stringify({
          inspectionUrl: siteUrl,
          siteUrl: targetProperty,
        }),
      });
      inspectionResult = inspectRes.inspectionResult;
    } catch (error) {
      console.warn('URL Inspection API failed:', error instanceof Error ? error.message : 'unknown');
    }

    const sitemapsRes = await googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedProperty}/sitemaps`);

    return NextResponse.json({
      property: targetProperty,
      performance: performanceData,
      performanceTotals,
      inspection: inspectionResult,
      sitemaps: sitemapsRes.sitemap || [],
    });
  } catch (error) {
    console.error('Search Console API Error:', error);
    if (error instanceof Error && error.message === 'AUTH_EXPIRED') {
      return NextResponse.json({ error: 'Session abgelaufen. Bitte erneut verbinden.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Fehler beim Abrufen der Search Console Daten.' }, { status: 500 });
  }
}

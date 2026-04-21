import { NextResponse } from 'next/server';

export const runtime = 'edge';
import { google } from 'googleapis';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const siteUrl = searchParams.get('url');

  if (!siteUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('gsc_tokens');

  if (!tokensCookie) {
    return NextResponse.json({ error: 'User not authenticated with Google' }, { status: 401 });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials(tokens);

    const searchconsole = google.searchconsole({ version: 'v1', auth });

    // 1. Find the property (handling prefix-match or domain-match)
    const siteList = await searchconsole.sites.list();
    const sites = siteList.data.siteEntry || [];
    
    // Simple matching: find a site that is a prefix of the provided URL or matches the domain
    const matchedSite = sites.find(s => siteUrl.startsWith(s.siteUrl || '')) || sites[0]; 

    if (!matchedSite) {
      return NextResponse.json({ error: 'Keine passende Search Console Property gefunden.' }, { status: 404 });
    }

    const targetProperty = matchedSite.siteUrl!;

    // 2. Fetch Performance Data (Last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const performanceResponse = await searchconsole.searchanalytics.query({
      siteUrl: targetProperty,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['date'],
        rowLimit: 31
      }
    });

    const performanceData = performanceResponse.data.rows || [];
    const performanceTotals = performanceData.reduce((acc, row) => ({
      clicks: acc.clicks + (row.clicks || 0),
      impressions: acc.impressions + (row.impressions || 0)
    }), { clicks: 0, impressions: 0 });

    // 3. Inspect the specific URL (Requires URL Inspection API)
    let inspectionResult = null;
    try {
      const inspectRes = await searchconsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: siteUrl,
          siteUrl: targetProperty
        }
      });
      inspectionResult = inspectRes.data.inspectionResult;
    } catch (e) {
      console.warn("URL Inspection API failed (common for non-owner or restricted accounts):", e);
    }

    // 4. Get Sitemaps
    const sitemapsRes = await searchconsole.sitemaps.list({ siteUrl: targetProperty });

    return NextResponse.json({
      property: targetProperty,
      performance: performanceData,
      performanceTotals,
      inspection: inspectionResult,
      sitemaps: sitemapsRes.data.sitemap || []
    });

  } catch (error: any) {
    console.error('Search Console API Error:', error);
    if (error.code === 401) {
       return NextResponse.json({ error: 'Session abgelaufen. Bitte erneut verbinden.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Fehler beim Abrufen der Search Console Daten.' }, { status: 500 });
  }
}

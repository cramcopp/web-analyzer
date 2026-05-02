import { NextResponse } from 'next/server';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, updateDocument } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { z } from 'zod';

const competitorsSchema = z.object({
  niche: z.string().min(1, "Nische ist erforderlich"),
  domain: z.string().optional(),
});

export const runtime = 'nodejs';

// Add timeout wrapper
const fetchWithTimeout = async (url: string, ms = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export async function POST(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();

  if (!user || !token) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = competitorsSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error.issues[0]?.message || 'Ungültige Eingabe' 
      }, { status: 400 });
    }

    const { niche, domain } = result.data;

    // Rate Limiting (Throttle: 1 request per 10 seconds per user)
    const userData = await getDocument('users', user.uid, token, env);
    const now = Date.now();
    const lastReq = userData?.lastCompetitorReqAt ? new Date(userData.lastCompetitorReqAt).getTime() : 0;
    
    if (now - lastReq < 10000) { // 10 seconds
      return NextResponse.json({ 
        error: 'Zu viele Anfragen', 
        details: 'Bitte warte einen Moment, bevor du eine neue Wettbewerber-Suche startest.' 
      }, { status: 429 });
    }

    // Update last request time
    await updateDocument('users', user.uid, { lastCompetitorReqAt: new Date(now).toISOString() }, token, env);

    if (!niche) {
      return NextResponse.json({ error: 'Niche is required' }, { status: 400 });
    }

    const apiKey = env.GOOGLE_API_KEY;
    const cx = env.GOOGLE_CX;

    if (!apiKey || !cx) {
       console.warn("GOOGLE_API_KEY or GOOGLE_CX missing. Skipping competitor search.");
       return NextResponse.json({ competitors: [] }, { status: 200 });
    }

    // Prepare Custom Search query
    // We add a broad search pattern if the global toggle is off, 
    // although the API often respects the query regardless of the toggle for JSON API users.
    const queryStr = `${niche}`;
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(queryStr)}&num=10`;

    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(5000)
    });

    if (!searchRes.ok) {
       const errBody = await searchRes.json().catch(() => ({}));
       console.error("Custom Search Error:", errBody);
       
       // Handle case where specific search features are disabled
       if (errBody.error?.status === 'PERMISSION_DENIED') {
          return NextResponse.json({ 
             competitors: [], 
             warning: 'Google Search API Access Denied. Please ensure Custom Search API is enabled in Cloud Console and the CX ID is correct.' 
          });
       }
       return NextResponse.json({ error: 'Search API Error' }, { status: searchRes.status });
    }

    const searchData = await searchRes.json();
    const items = searchData.items || [];
    
    // Filter out our own domain
    const filteredItems = items.filter((i: any) => {
       try {
           if (!domain) return true;
           const u = new URL(i.link);
           return !u.hostname.includes(domain);
       } catch {
           return true; 
       }
    }).slice(0, 3); // Take top 3

    if (filteredItems.length === 0) {
       return NextResponse.json({ competitors: [] });
    }

    // Scrape competitors
    const competitorPromises = filteredItems.map(async (item: any) => {
       try {
          const res = await fetchWithTimeout(item.link, 6000);
          if (!res.ok) return { url: item.link, name: item.title, error: 'Access Denied' };
          
          const html = await res.text();
          
          // Lightweight regex extraction to avoid heavy parser dependencies
          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : item.title;
          
          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || 
                           html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
          const metaDescription = descMatch ? descMatch[1] : item.snippet;
          
          const h1Matches = html.match(/<h1[^>]*>/gi);
          const h1Count = h1Matches ? h1Matches.length : 0;
          
          return {
             url: item.link,
             name: title,
             snippet: item.snippet,
             metaDescription,
             h1Count
          };
       } catch (e: any) {
          return {
             url: item.link,
             name: item.title,
             snippet: item.snippet,
             error: e.name === 'AbortError' ? 'Timeout' : 'Scrape Failed'
          };
       }
    });

    const competitorsList = await Promise.all(competitorPromises);

    return NextResponse.json({ competitors: competitorsList });

  } catch (err: any) {
    console.error("Competitor API Route Catch Error:", err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'edge';

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
  try {
    const { niche, domain } = await req.json();

    if (!niche) {
      return NextResponse.json({ error: 'Niche is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;

    if (!apiKey || !cx) {
       console.warn("GOOGLE_API_KEY or GOOGLE_CX missing. Skipping competitor search.");
       return NextResponse.json({ competitors: [] }, { status: 200 });
    }

    // Prepare Custom Search query
    const queryStr = `${niche}`;
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(queryStr)}&num=5`;

    const searchRes = await fetch(searchUrl, {
      // Small timeout for the Google API call
      signal: AbortSignal.timeout(5000)
    });

    if (!searchRes.ok) {
       const text = await searchRes.text();
       console.error("Custom Search Error:", text);
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
          const $ = cheerio.load(html);
          
          const title = $('title').text().trim() || item.title;
          const metaDescription = $('meta[name="description"]').attr('content') || item.snippet;
          const h1Count = $('h1').length;
          
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

import { parse } from 'node-html-parser';
import { 
  ScanOptions, 
  AnalysisResult, 
  LighthouseScores, 
  PsiMetrics, 
  SslCertificateData, 
  SubpageResult 
} from './scanner/types';

export type { 
  ScanOptions, 
  AnalysisResult, 
  LighthouseScores, 
  PsiMetrics, 
  SslCertificateData, 
  SubpageResult 
};

const STEALTH_CONFIG = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  }
};

/**
 * Radikal reduziert HTML auf das Wesentliche für die KI.
 * Phase 4: Extreme Stripping (Entfernt Scripte, Styles, Header, Footer, Nav)
 */
function stripHtmlForAi(html: string): string {
  let s = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  s = s.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  s = s.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '[SVG]');
  s = s.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');
  s = s.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');
  s = s.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/data:[^;]+;base64,[^"']{100,}/g, '[BASE64_BLOB]');
  return s;
}

function isSameBaseDomain(hostname: string, baseDomain: string): boolean {
  const normHost = hostname.replace(/^www\./, '').toLowerCase();
  const normBase = baseDomain.replace(/^www\./, '').toLowerCase();
  return normHost === normBase;
}

function extractRawData(root: any, currentUrl: string, domain: string): string[] {
  const discoveredUrls = new Set<string>();

  // Task 3.1: Absolute URL conversion for <a> tags
  root.querySelectorAll('a').forEach((el: any) => {
    const href = el.getAttribute('href');
    if (href) {
      try {
        const urlObj = new URL(href, currentUrl);
        if (isSameBaseDomain(urlObj.hostname, domain)) {
          const clean = urlObj.origin + urlObj.pathname + urlObj.search;
          discoveredUrls.add(clean);
        }
      } catch {}
    }
  });

  // Task 3.2: Harvest Head links (alternate, next, prev, canonical)
  root.querySelectorAll('link[rel="alternate"], link[rel="next"], link[rel="prev"], link[rel="canonical"]').forEach((el: any) => {
    const href = el.getAttribute('href');
    if (href) {
      try {
        const urlObj = new URL(href, currentUrl);
        if (isSameBaseDomain(urlObj.hostname, domain)) {
          const clean = urlObj.origin + urlObj.pathname + urlObj.search;
          discoveredUrls.add(clean);
        }
      } catch {}
    }
  });

  // Task 3.3: JS State Extraction via RegEx
  root.querySelectorAll('script').forEach((el: any) => {
    const content = el.text;
    if (content) {
      const regex = /https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:\/[^\s"']*)?/g;
      const matches = content.match(regex);
      if (matches) {
        matches.forEach((m: string) => {
          try {
            const urlObj = new URL(m);
            if (isSameBaseDomain(urlObj.hostname, domain)) {
              const clean = urlObj.origin + urlObj.pathname + urlObj.search;
              discoveredUrls.add(clean);
            }
          } catch {}
        });
      }
    }
  });

  return Array.from(discoveredUrls);
}

async function fetchSitemapRecursive(sUrl: string, visited = new Set<string>()): Promise<string[]> {
  if (visited.has(sUrl) || visited.size > 100) return [];
  visited.add(sUrl);

  const foundUrls: string[] = [];
  try {
    const res = await fetch(sUrl, { ...STEALTH_CONFIG, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const xml = await res.text();

    // Check for nested sitemaps (Sitemap Index)
    if (xml.includes('<sitemap>')) {
      const nestedSitemaps = xml.match(/<loc>(.*?)<\/loc>/gi);
      if (nestedSitemaps) {
        for (const m of nestedSitemaps) {
          const inner = m.replace(/<\/?loc>/gi, '').trim();
          if (inner.startsWith('http')) {
            const subUrls = await fetchSitemapRecursive(inner, visited);
            foundUrls.push(...subUrls);
          }
        }
      }
    } else {
      // Regular sitemap
      const locMatches = xml.match(/<loc>(.*?)<\/loc>/gi);
      if (locMatches) {
        locMatches.forEach(m => {
          const inner = m.replace(/<\/?loc>/gi, '').trim();
          if (inner.startsWith('http')) foundUrls.push(inner);
        });
      }
    }
  } catch (e) { /* ignore */ }
  return foundUrls;
}

async function getPreflightData(baseUrl: string): Promise<any> {
  const url = new URL(baseUrl);
  const robotsUrl = `${url.origin}/robots.txt`;
  let robotsTxt = { status: 404, content: '', allowed: true, sitemaps: [] as string[], crawlDelay: 0 };
  
  try {
    const res = await fetch(robotsUrl, { ...STEALTH_CONFIG, signal: AbortSignal.timeout(5000) });
    robotsTxt.status = res.status;
    if (res.ok) {
      const text = await res.text();
      robotsTxt.content = text;
      const lines = text.split('\n');
      for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();
        if (lowerLine.startsWith('sitemap:')) {
          robotsTxt.sitemaps.push(line.split(/sitemap:/i)[1].trim());
        }
        if (lowerLine.startsWith('crawl-delay:')) {
          robotsTxt.crawlDelay = parseInt(line.split(/crawl-delay:/i)[1].trim()) || 0;
        }
      }
    }
  } catch (e) { /* ignore */ }

  if (robotsTxt.sitemaps.length === 0) {
    robotsTxt.sitemaps.push(`${url.origin}/sitemap.xml`);
  }

  const sitemapUrls: string[] = [];
  const visitedSitemaps = new Set<string>();
  for (const sUrl of robotsTxt.sitemaps) {
    const urls = await fetchSitemapRecursive(sUrl, visitedSitemaps);
    sitemapUrls.push(...urls);
  }

  return { robotsTxt, sitemapUrls };
}

export async function performAnalysis({ url, plan = 'free' }: ScanOptions): Promise<AnalysisResult> {
  const PLAN_LIMITS: Record<string, number> = {
    'free': 0,
    'pro': 25,
    'agency': 500
  };
  const subpageLimit = PLAN_LIMITS[plan] || 0;
  const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
  const domain = urlObj.hostname;
  const apiKey = process.env.GOOGLE_API_KEY;

  const preflight = await getPreflightData(urlObj.origin);
  const crawlDelayMs = (preflight.robotsTxt.crawlDelay || 0) * 1000;
  const startTime = Date.now();
  
  const htmlRequestConfig = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  };
  
  const rdapPromise = fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { signal: AbortSignal.timeout(10000) }).catch(() => null);
  const sslPromise = fetch(`https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(domain)}&publish=off&all=done`, { signal: AbortSignal.timeout(10000) }).catch(() => null);
  
  const ttfbStart = Date.now();
  const htmlPromise = fetch(urlObj.toString(), { ...STEALTH_CONFIG, signal: AbortSignal.timeout(10000) });
  
  const response = await htmlPromise;
  const ttfbMs = Date.now() - ttfbStart;
  const responseTimeMs = Date.now() - startTime;

  if (!response.ok) {
    throw new Error(`Failed to fetch the URL (Status: ${response.status})`);
  }

  const html = await response.text();
  const root = parse(html);

  // --- Header Analysis ---
  const headers = Object.fromEntries(response.headers.entries());
  const securityHeaders: Record<string, string> = {
    'Content-Security-Policy': headers['content-security-policy'] ? 'Present' : 'Missing',
    'Strict-Transport-Security': headers['strict-transport-security'] ? 'Present' : 'Missing',
    'X-Frame-Options': headers['x-frame-options'] || 'Missing',
    'X-Content-Type-Options': headers['x-content-type-options'] || 'Missing',
    'Referrer-Policy': headers['referrer-policy'] || 'Missing'
  };

  const cdn = 
    headers['cf-ray'] ? 'Cloudflare' :
    headers['x-vercel-id'] ? 'Vercel' :
    headers['x-akamai-transformed'] ? 'Akamai' :
    headers['server']?.includes('Cloudfront') ? 'Amazon CloudFront' :
    'None detected';

  const serverInfo = headers['server'] || 'Hidden';

  // --- Queue Engine (Phase 2) ---
  const queue = new Set<string>();
  const processed = new Set<string>();
  const allInternalLinks = new Set<string>();
  const subpageResults: SubpageResult[] = [];
  
  // Seed queue with sitemap URLs (if they match domain)
  preflight.sitemapUrls.forEach((u: string) => {
    try {
      const uObj = new URL(u);
      if (isSameBaseDomain(uObj.hostname, domain)) {
        queue.add(u);
        allInternalLinks.add(u);
      }
    } catch {}
  });

  // Root Analysis (Main Page)
  processed.add(urlObj.toString());
  allInternalLinks.add(urlObj.toString());
  queue.delete(urlObj.toString());

  // Task 3: Raw Data Extraction (Main Page)
  const rootLinks = extractRawData(root, urlObj.toString(), domain);
  rootLinks.forEach(l => {
    allInternalLinks.add(l);
    if (!processed.has(l)) queue.add(l);
  });

  // Task 2.1: Continuous while-loop
  const scanSubpage = async (subUrl: string): Promise<SubpageResult> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const subRes = await fetch(subUrl, { 
        signal: controller.signal, 
        headers: STEALTH_CONFIG.headers 
      });
      clearTimeout(timeout);
      if (!subRes.ok) return { error: true, url: subUrl, status: subRes.status };
      
      const subHtml = await subRes.text();
      const subRoot = parse(subHtml);
      
      // Task 3: Raw Data Extraction (MUST happen on untouched HTML)
      const subInternalLinks = extractRawData(subRoot, subUrl, domain);
      
      // Phase 4: Extreme Stripping (AFTER extraction)
      const strippedContent = stripHtmlForAi(subHtml).replace(/\s+/g, ' ').trim().slice(0, 15000);

      return {
        error: false, url: subUrl, title: subRoot.querySelector('title')?.text.trim() || '',
        metaDescription: subRoot.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        robots: subRoot.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index, follow',
        canonical: subRoot.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
        h1Count: subRoot.querySelectorAll('h1').length, 
        status: subRes.status,
        strippedContent,
        links: subInternalLinks
      };
    } catch (e) { return { error: true, url: subUrl, status: 'Error' }; }
  };

  while (queue.size > 0 && subpageResults.length < subpageLimit) {
    const currentUrl = Array.from(queue).shift()!;
    queue.delete(currentUrl);
    if (processed.has(currentUrl)) continue;
    processed.add(currentUrl);

    if (crawlDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.min(crawlDelayMs, 3000)));
    }

    const result = await scanSubpage(currentUrl);
    subpageResults.push(result);

    // Feed found links back into queue
    if (!result.error && result.links) {
      result.links.forEach(l => {
        allInternalLinks.add(l);
        if (!processed.has(l)) queue.add(l);
      });
    }
  }

  const successfulSubpages = subpageResults.filter(r => !r.error).map(({ error: _, ...d }) => d);

  // --- Indexability Check ---
  const robots = root.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index, follow';
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  
  const isIndexable = (url: string, rb: string, can?: string | null) => {
    if (rb.toLowerCase().includes('noindex')) return false;
    if (can) {
      try {
        const canAbs = new URL(can, url).toString();
        const urlAbs = new URL(url).toString();
        if (canAbs !== urlAbs) return false;
      } catch { /* ignore */ }
    }
    return true;
  };

  const mainIsIndexable = isIndexable(urlObj.toString(), robots, canonical);
  const indexableSubpagesCount = successfulSubpages.filter(p => isIndexable(p.url, p.robots || '', p.canonical)).length;
  const indexablePagesCount = (mainIsIndexable ? 1 : 0) + indexableSubpagesCount;

  // Metadata Extraction
  const title = root.querySelector('title')?.text.trim() || '';
  const ogDescription = root.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
  const metaDescription = root.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const htmlStripped = stripHtmlForAi(html);
  const bodyText = htmlStripped.replace(/\s+/g, ' ').trim().slice(0, 500000); 
  const h1Texts = root.querySelectorAll('h1').map(el => el.text.replace(/\s+/g, ' ').trim());
  const h2Texts = root.querySelectorAll('h2').map(el => el.text.replace(/\s+/g, ' ').trim());
  const h3Texts = root.querySelectorAll('h3').map(el => el.text.replace(/\s+/g, ' ').trim());

  const techStack: string[] = [];
  if (html.includes('__NEXT_DATA__')) techStack.push('Next.js');
  if (html.includes('wp-content')) techStack.push('WordPress');

  const rdapRes = await rdapPromise;
  let domainAgeStr = "Unknown";
  if (rdapRes && rdapRes.ok) {
    const rdapData = await rdapRes.json();
    const regEvent = rdapData.events?.find((e: any) => e.eventAction === 'registration');
    if (regEvent?.eventDate) domainAgeStr = regEvent.eventDate.split('T')[0] as string;
  }

  return {
    audit_id: Math.random().toString(36).substring(7).toUpperCase(),
    createdAt: new Date().toISOString(),
    urlObj: urlObj.toString(), title, metaDescription, metaKeywords: '', htmlLang: '', hreflangs: [], generator: '', viewport: '',
    viewportScalable: 'Yes',
    robots, h1Count: h1Texts.length, h2Count: h2Texts.length, imagesTotal: 0, imagesWithoutAlt: 0, lazyImages: 0, 
    maxDomDepth: 0, 
    headings: { h1: h1Texts, h2: h2Texts, h3: h3Texts },
    imageDetails: [],
    semanticTags: { main: 0, article: 0, section: 0, nav: 0, header: 0, footer: 0, aside: 0 },
    napSignals: { googleMapsLinks: 0, phoneLinks: 0 },
    dataLeakage: { emailsFoundCount: 0, sampleEmails: [] },
    internalLinksCount: allInternalLinks.size, externalLinksCount: 0, totalScripts: 0, blockingScripts: 0, totalStylesheets: 0,
    responseTimeMs, ttfbMs, preflight, psiMetricsStr: '', psiMetrics: null, lighthouseScores: null, safeBrowsingStr: '', domainAge: domainAgeStr, sslCertificate: { status: 'READY' },
    wienerSachtextIndex: 0, bodyText, techStack,
    cdn,
    serverInfo,
    legal: { trackingScripts: {}, cmpDetected: {}, linksInFooter: false, privacyInFooter: false, cookieBannerFound: false },
    social: { ogTitle: title, ogDescription, ogImage: '', ogType: 'website', twitterCard: 'summary' },
    existingSchemaCount: 0,
    schemaTypes: [],
    securityHeaders,
    headers,
    crawlSummary: { 
      totalInternalLinks: allInternalLinks.size, 
      scannedSubpagesCount: successfulSubpages.length, 
      indexablePagesCount,
      scannedSubpages: successfulSubpages as Omit<SubpageResult, 'error'>[], 
      brokenLinks: [] 
    },
    apiEndpoints: []
  };
}

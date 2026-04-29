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
  },
  redirect: 'manual' as const
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

function normalizeUrl(url: string, baseUrl: string): string | null {
  try {
    const urlObj = new URL(url, baseUrl);
    urlObj.hash = ''; // Anker immer weg
    // WICHTIG: Trailing Slash weg für die Vergleichbarkeit in der Queue
    return urlObj.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function extractRawData(root: any, currentUrl: string, domain: string, rawHtml: string): string[] {
  const discoveredUrls = new Set<string>();
  const baseTag = root.querySelector('base');
  const baseUrl = baseTag?.getAttribute('href') ? new URL(baseTag.getAttribute('href'), currentUrl).toString() : currentUrl;
  const baseDomain = new URL(baseUrl).hostname.replace(/^www\./, '').toLowerCase();

  const processUrl = (href: string | undefined | null) => {
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return;
    const normalized = normalizeUrl(href.split('#')[0].trim(), baseUrl);
    if (normalized) {
      try {
        const targetDomain = new URL(normalized).hostname.replace(/^www\./, '').toLowerCase();
        if (targetDomain === baseDomain) discoveredUrls.add(normalized);
      } catch {}
    }
  };

  // 1. <a> Tags
  root.querySelectorAll('a[href]').forEach((el: any) => processUrl(el.getAttribute('href')));

  // 2. Head Links (Canonical, etc.)
  root.querySelectorAll('link[rel="alternate"], link[rel="next"], link[rel="prev"], link[rel="canonical"]').forEach((el: any) => processUrl(el.getAttribute('href')));

  // 3. Regex Fallback
  const patterns = [/(https?:\/\/[^\s"'<>]+)/g, /(?<=href=["'])([^"']+)(?=["'])/g];
  patterns.forEach(regex => {
    const matches = rawHtml.match(regex);
    if (matches) matches.forEach(m => processUrl(m));
  });

  return Array.from(discoveredUrls);
}

export async function getAllUrlsBeforeCrawl(baseUrl: string): Promise<string[]> {
    const allUrls = new Set<string>();
    allUrls.add(baseUrl); // Startseite ist immer drin

    const cleanBase = baseUrl.replace(/\/$/, '');
    const sitemapsToVisit: string[] = [
        `${cleanBase}/sitemap.xml`, 
        `${cleanBase}/wp-sitemap.xml`,
        `${cleanBase}/sitemap_index.xml` // Der fehlende Standard für Yoast SEO!
    ];
    
    // 1. Suche nach versteckten Sitemaps in der robots.txt
    try {
        const robotsRes = await fetch(`${cleanBase}/robots.txt`, { ...STEALTH_CONFIG, signal: AbortSignal.timeout(5000) });
        if (robotsRes.status === 200) {
            const robotsText = await robotsRes.text();
            const sitemapMatches = robotsText.match(/^Sitemap:\s*(.*)$/gmi);
            if (sitemapMatches) {
                sitemapMatches.forEach(match => {
                    const url = match.replace(/Sitemap:\s*/i, '').trim();
                    if (!sitemapsToVisit.includes(url)) sitemapsToVisit.push(url);
                });
            }
        }
    } catch(e) { /* robots.txt fehlt, egal */ }

    // 2. Alle Sitemaps rekursiv entpacken (Das schlägt Wix, Shopify & WP)
    const visitedSitemaps = new Set<string>();

    while (sitemapsToVisit.length > 0) {
        const currentSitemap = sitemapsToVisit.pop()!;
        if (visitedSitemaps.has(currentSitemap)) continue;
        visitedSitemaps.add(currentSitemap);

        try {
            const res = await fetch(currentSitemap, { ...STEALTH_CONFIG, signal: AbortSignal.timeout(8000) });
            if (res.status !== 200) continue;
            
            const xmlText = await res.text();
            
            // DER FIX: Dieser Regex ignoriert Namespaces (wie <sitemap:loc> oder <image:loc>)
            const locRegex = /<(?:[a-z0-9]+:)?loc>\s*(.*?)\s*<\/(?:[a-z0-9]+:)?loc>/gi;
            let match;
            
            while ((match = locRegex.exec(xmlText)) !== null) {
                const url = match[1].trim();
                if (!url) continue;
                
                if (url.endsWith('.xml') || url.includes('sitemap')) {
                    if (!visitedSitemaps.has(url)) sitemapsToVisit.push(url);
                } else {
                    allUrls.add(url);
                }
            }
        } catch (e) { /* Sitemap kaputt, weitermachen */ }
    }
    
    return Array.from(allUrls);
}

function isAllowedByRobots(robotsContent: string, path: string): boolean {
  if (!robotsContent) return true;
  const lines = robotsContent.split('\n');
  let currentUserAgentActive = false;
  const disallows: string[] = [];
  const allows: string[] = [];

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();
    if (!key || !value) continue;

    const lowerKey = key.toLowerCase().trim();
    if (lowerKey === 'user-agent') {
      currentUserAgentActive = (value === '*' || value.toLowerCase().includes('googlebot'));
    } else if (currentUserAgentActive) {
      if (lowerKey === 'disallow') disallows.push(value);
      if (lowerKey === 'allow') allows.push(value);
    }
  }

  // Check allows first (more specific usually wins in some parsers, but here we just check if any allow matches)
  for (const pattern of allows) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '\\?') + '($|/)');
    if (regex.test(path)) return true;
  }

  for (const pattern of disallows) {
    if (!pattern) continue; // Disallow: (empty) means everything allowed
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '\\?') + '($|/)');
    if (regex.test(path)) return false;
  }

  return true;
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
        if (lowerLine.startsWith('crawl-delay:')) {
          robotsTxt.crawlDelay = parseInt(line.split(/crawl-delay:/i)[1].trim()) || 0;
        }
      }
    }
  } catch (e) { /* ignore */ }

  // Nutze den neuen Unpacker für die URLs
  const sitemapUrls = await getAllUrlsBeforeCrawl(url.origin);

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
  
  // Seed queue with sitemap URLs
  preflight.sitemapUrls.forEach((u: string) => {
    const normalized = normalizeUrl(u, urlObj.origin);
    if (normalized) {
      const uObj = new URL(normalized);
      if (isSameBaseDomain(uObj.hostname, domain)) {
        queue.add(normalized);
        allInternalLinks.add(normalized);
      }
    }
  });

  // Root Analysis (Main Page)
  urlObj.hash = '';
  const mainUrl = urlObj.toString();
  processed.add(mainUrl);
  allInternalLinks.add(mainUrl);
  queue.delete(mainUrl);

  // Task 3: Raw Data Extraction (Main Page)
  const rootLinks = extractRawData(root, urlObj.toString(), domain, html);
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
        ...STEALTH_CONFIG,
        signal: controller.signal
      });
      clearTimeout(timeout);

      // Task 1.2: 3xx-Status abfangen
      if (subRes.status >= 300 && subRes.status < 400) {
        return { 
          error: false, 
          url: subUrl, 
          status: subRes.status, 
          links: [],
          xRobotsTag: subRes.headers.get('X-Robots-Tag') || '',
          redirectLocation: subRes.headers.get('location') || ''
        };
      }

      if (!subRes.ok) return { error: true, url: subUrl, status: subRes.status };
      
      const subHtml = await subRes.text();
      const subRoot = parse(subHtml);
      const subContentType = subRes.headers.get('content-type') || '';
      
      // NEU: Wenn es kein HTML ist (PDF, JPG), zählen wir es, parsen es aber nicht!
      if (subContentType && !subContentType.toLowerCase().includes('text/html')) {
        return {
          error: false, 
          url: subUrl, 
          status: subRes.status, 
          contentType: subContentType, 
          title: 'Media/Document', // Verhindert Absturz beim Parsen
          links: [], 
          strippedContent: '',
          xRobotsTag: subRes.headers.get('X-Robots-Tag') || '',
          hasNextPrev: false
        };
      }
      const hasNextPrev = !!(subRoot.querySelector('link[rel="next"]') || subRoot.querySelector('link[rel="prev"]'));
      
      // Task 3: Raw Data Extraction (MUST happen on untouched HTML)
      const subInternalLinks = extractRawData(subRoot, subUrl, domain, subHtml);
      
      // Phase 4: Extreme Stripping (AFTER extraction)
      const strippedContent = stripHtmlForAi(subHtml).replace(/\s+/g, ' ').trim().slice(0, 15000);

      return {
        error: false, url: subUrl, title: subRoot.querySelector('title')?.text.trim() || '',
        metaDescription: subRoot.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        robots: subRoot.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index, follow',
        canonical: subRoot.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
        h1Count: subRoot.querySelectorAll('h1').length, 
        status: subRes.status,
        contentType: subContentType,
        strippedContent,
        links: subInternalLinks,
        xRobotsTag: subRes.headers.get('X-Robots-Tag') || '',
        hasNextPrev
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

    // Task 1.2: Redirect processing
    if (typeof result.status === 'number' && result.status >= 300 && result.status < 400 && result.redirectLocation) {
      try {
        const targetUrl = new URL(result.redirectLocation, currentUrl);
        if (isSameBaseDomain(targetUrl.hostname, domain) && !processed.has(targetUrl.toString())) {
          queue.add(targetUrl.toString());
        }
      } catch { /* Invalid URL */ }
    }

    // Feed found links back into queue
    if (!result.error && result.links) {
      result.links.forEach(l => {
        allInternalLinks.add(l);
        if (!processed.has(l)) queue.add(l);
      });
    }
  }

  const successfulSubpages = subpageResults.filter(r => !r.error).map(({ error: _, ...d }) => d);

  // --- Indexability Check (Phase 3) ---
  const robots = root.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index, follow';
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  const xRobotsTag = response.headers.get('x-robots-tag') || '';

function isSoft404(text: string): boolean {
  // Das 50-Wörter-Limit war der Tod für lokale Seiten! Drastisch reduziert.
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount < 5) return true; 
  
  const soft404Keywords = [
    'nicht gefunden', 'nothing found', 'error 404', 'seite nicht vorhanden'
  ];
  const lowerText = text.toLowerCase();
  return soft404Keywords.some(kw => lowerText.includes(kw));
}

const checkIndexability = (
  url: string, status: number | string, rb: string, xRobots: string, 
  contentType: string, text: string, robotsTxtContent: string, 
  can?: string | null, hasNextPrev?: boolean
): { isIndexable: boolean; reason: string } => {
  if (status !== 200) return { isIndexable: false, reason: `Status ${status}` };
  if (contentType && !contentType.toLowerCase().includes('text/html')) return { isIndexable: false, reason: `Content-Type (${contentType})` };

  const xRobotsLower = xRobots.toLowerCase();
  const metaRobotsLower = rb.toLowerCase();
  if (xRobotsLower.includes('noindex') || xRobotsLower.includes('none') ||
      metaRobotsLower.includes('noindex') || metaRobotsLower.includes('none')) {
    return { isIndexable: false, reason: "Noindex detected" };
  }

  try {
    const urlObj = new URL(url);
    if (!isAllowedByRobots(robotsTxtContent, urlObj.pathname + urlObj.search)) {
      return { isIndexable: false, reason: "robots.txt Disallow" };
    }
  } catch {}

  if (isSoft404(text)) return { isIndexable: false, reason: "Soft-404 Detection" };

  if (!can || can.trim() === '') return { isIndexable: true, reason: "OK (No Canonical)" };

  try {
    // DER FIX: Schneidet JETZT http(s):// und www. weg, um saubere Vergleiche zu machen!
    const cleanUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').split('?')[0].replace(/\/$/, '');
    const absoluteCanonical = new URL(can, url).href;
    
    if (cleanUrl(url) === cleanUrl(absoluteCanonical)) return { isIndexable: true, reason: "OK (Canonical Match)" };
    
    if (url.includes('?') && hasNextPrev) return { isIndexable: true, reason: "OK (Pagination Exception)" };
    
    return { isIndexable: false, reason: `Canonical Mismatch` };
  } catch (e) {
    return { isIndexable: true, reason: "OK (Broken Canonical fallback)" };
  }
};

  // Metadata Extraction
  const title = root.querySelector('title')?.text.trim() || '';
  const ogDescription = root.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
  const metaDescription = root.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const htmlStripped = stripHtmlForAi(html);
  const bodyText = htmlStripped.replace(/\s+/g, ' ').trim().slice(0, 500000); 
  const h1Texts = root.querySelectorAll('h1').map(el => el.text.replace(/\s+/g, ' ').trim());
  const h2Texts = root.querySelectorAll('h2').map(el => el.text.replace(/\s+/g, ' ').trim());
  const h3Texts = root.querySelectorAll('h3').map(el => el.text.replace(/\s+/g, ' ').trim());

  const mainIndexResult = checkIndexability(
    urlObj.toString(), 
    response.status, 
    robots, 
    xRobotsTag, 
    headers['content-type'] || '',
    bodyText,
    preflight.robotsTxt.content,
    canonical,
    !!(root.querySelector('link[rel="next"]') || root.querySelector('link[rel="prev"]'))
  );
  
  if (!mainIndexResult.isIndexable) {
    console.log(`❌ Abgelehnt: ${urlObj.toString()} -> Grund: ${mainIndexResult.reason}`);
  } else {
    console.log(`✅ Indexierbar: ${urlObj.toString()}`);
  }

  const indexableSubpages: any[] = [];
  successfulSubpages.forEach(p => {
    const res = checkIndexability(
      p.url, 
      p.status as number, 
      p.robots || '', 
      p.xRobotsTag || '', 
      p.contentType || '', 
      p.strippedContent || '', 
      preflight.robotsTxt.content,
      p.canonical,
      p.hasNextPrev
    );
    if (res.isIndexable) {
      indexableSubpages.push(p);
      console.log(`✅ Indexierbar: ${p.url}`);
    } else {
      console.log(`❌ Abgelehnt: ${p.url} -> Grund: ${res.reason}`);
    }
  });

  const mainIsIndexable = mainIndexResult.isIndexable;
  const indexablePagesCount = (mainIsIndexable ? 1 : 0) + indexableSubpages.length;

  // Task 6.1: Array-Export Script (Internal for reporting)
  const crawledUrls = Array.from(allInternalLinks);
  const indexableUrls = [
    ...(mainIsIndexable ? [urlObj.toString()] : []),
    ...indexableSubpages.map(p => p.url)
  ];

  // Task 6.2: Visueller Diff-Vergleich (Konsole)
  console.log("--- CRAWL DIFF ENGINE ---");
  console.log("CRAWLED_URLS_JSON:", JSON.stringify(crawledUrls));
  console.log("INDEXABLE_URLS_JSON:", JSON.stringify(indexableUrls));
  console.log("--------------------------");

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
      crawledUrls,
      indexableUrls,
      scannedSubpages: successfulSubpages as Omit<SubpageResult, 'error'>[], 
      brokenLinks: [] 
    },
    apiEndpoints: []
  };
}

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

// --- CONFIG & UTILS ---

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

export function normalizeUrl(url: string, baseUrl: string): string | null {
  try {
    const urlObj = new URL(url, baseUrl);
    urlObj.hash = ''; 
    const junkParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid', 'ref'];
    junkParams.forEach(p => urlObj.searchParams.delete(p));
    return urlObj.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function isSameBaseDomain(hostname: string, baseDomain: string): boolean {
  const normHost = hostname.replace(/^www\./, '').toLowerCase();
  const normBase = baseDomain.replace(/^www\./, '').toLowerCase();
  return normHost === normBase;
}

export function stripHtmlForAi(html: string): string {
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

// --- CRAWL CORE LOGIC ---

export function extractRawData(root: any, currentUrl: string, rawHtml: string): string[] {
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

  root.querySelectorAll('a[href]').forEach((el: any) => processUrl(el.getAttribute('href')));
  root.querySelectorAll('link[rel="alternate"], link[rel="next"], link[rel="prev"], link[rel="canonical"]').forEach((el: any) => processUrl(el.getAttribute('href')));

  const patterns = [/(https?:\/\/[^\s"'<>]+)/g, /(?<=href=["'])([^"']+)(?=["'])/g];
  patterns.forEach(regex => {
    const matches = rawHtml.match(regex);
    if (matches) matches.forEach(m => processUrl(m));
  });

  return Array.from(discoveredUrls);
}

export async function getAllUrlsBeforeCrawl(baseUrl: string, robotsTxt?: string): Promise<string[]> {
    const allUrls = new Set<string>();
    allUrls.add(baseUrl);
    const cleanBase = baseUrl.replace(/\/$/, '');
    const sitemapsToVisit: string[] = [
        `${cleanBase}/sitemap.xml`, 
        `${cleanBase}/wp-sitemap.xml`,
        `${cleanBase}/sitemap_index.xml`
    ];
    
    if (robotsTxt) {
      const sitemapMatches = robotsTxt.match(/^Sitemap:\s*(.*)$/gmi);
      if (sitemapMatches) {
        sitemapMatches.forEach(match => {
          const url = match.replace(/Sitemap:\s*/i, '').trim();
          if (!sitemapsToVisit.includes(url)) sitemapsToVisit.push(url);
        });
      }
    }

    const visitedSitemaps = new Set<string>();
    while (sitemapsToVisit.length > 0) {
        const currentSitemap = sitemapsToVisit.pop()!;
        if (visitedSitemaps.has(currentSitemap)) continue;
        visitedSitemaps.add(currentSitemap);

        try {
            const res = await fetch(currentSitemap, { ...STEALTH_CONFIG, signal: AbortSignal.timeout(8000) });
            if (res.status !== 200) continue;
            const xmlText = await res.text();
            const locRegex = /<(?:[a-z0-9]+:)?loc>\s*(.*?)\s*<\/(?:[a-z0-9]+:)?loc>/gi;
            let match;
            while ((match = locRegex.exec(xmlText)) !== null) {
                const url = match[1].trim();
                if (!url) continue;
                if (url.endsWith('.xml') || url.includes('sitemap')) {
                    if (!visitedSitemaps.has(url)) sitemapsToVisit.push(url);
                } else {
                    const norm = normalizeUrl(url, baseUrl);
                    if (norm) allUrls.add(norm);
                }
            }
        } catch (e) {}
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

  for (const pattern of allows) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '\\?') + '($|/)');
    if (regex.test(path)) return true;
  }
  for (const pattern of disallows) {
    if (!pattern) continue; 
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '\\?') + '($|/)');
    if (regex.test(path)) return false;
  }
  return true;
}

// --- INDEXABILITY ENGINE ---

function isSoft404(text: string): boolean {
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount < 5) return true; 
  const soft404Keywords = ['nicht gefunden', 'nothing found', 'error 404', 'seite nicht vorhanden'];
  const lowerText = text.toLowerCase();
  return soft404Keywords.some(kw => lowerText.includes(kw));
}

export function checkIndexability(
  url: string, status: number | string, rb: string, xRobots: string, 
  contentType: string, text: string, robotsTxtContent: string, 
  can?: string | null, hasNextPrev?: boolean
): { isIndexable: boolean; reason: string } {
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
    const clean = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').split('?')[0].replace(/\/$/, '');
    const absoluteCanonical = new URL(can, url).href;
    if (clean(url) === clean(absoluteCanonical)) return { isIndexable: true, reason: "OK (Canonical Match)" };
    if (url.includes('?') && hasNextPrev) return { isIndexable: true, reason: "OK (Pagination Exception)" };
    return { isIndexable: false, reason: `Canonical Mismatch` };
  } catch (e) {
    return { isIndexable: true, reason: "OK (Broken Canonical fallback)" };
  }
}


// --- MAIN ANALYZER ---



export const scanSubpage = async (subUrl: string, domain: string, robotsTxtContent: string = ''): Promise<SubpageResult & { isIndexable?: boolean }> => {
    try {
      const subRes = await fetch(subUrl, { ...STEALTH_CONFIG, signal: AbortSignal.timeout(10000) });
      if (subRes.status >= 300 && subRes.status < 400) {
        return { error: false, url: subUrl, status: subRes.status, links: [], xRobotsTag: subRes.headers.get('X-Robots-Tag') || '', redirectLocation: subRes.headers.get('location') || '' };
      }
      if (!subRes.ok) return { error: true, url: subUrl, status: subRes.status };
      
      const subContentType = subRes.headers.get('content-type') || '';
      if (subContentType && !subContentType.toLowerCase().includes('text/html')) {
        return { error: false, url: subUrl, status: subRes.status, contentType: subContentType, title: 'Media/Document', links: [], strippedContent: '', xRobotsTag: subRes.headers.get('X-Robots-Tag') || '', hasNextPrev: false };
      }

      const subHtml = await subRes.text();
      const subRoot = parse(subHtml);
      const subLinks = extractRawData(subRoot, subUrl, subHtml);
      const strippedContent = stripHtmlForAi(subHtml).replace(/\s+/g, ' ').trim().slice(0, 15000);

      const subResult: SubpageResult = {
        error: false, url: subUrl, title: subRoot.querySelector('title')?.text.trim() || '',
        metaDescription: subRoot.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        robots: subRoot.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index, follow',
        canonical: subRoot.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
        h1Count: subRoot.querySelectorAll('h1').length, status: subRes.status,
        contentType: subContentType, strippedContent, links: subLinks,
        xRobotsTag: subRes.headers.get('X-Robots-Tag') || '',
        hasNextPrev: !!(subRoot.querySelector('link[rel="next"]') || subRoot.querySelector('link[rel="prev"]'))
      };

      const indexCheck = checkIndexability(subUrl, subRes.status, subResult.robots || '', subResult.xRobotsTag || '', subContentType, strippedContent, robotsTxtContent, subResult.canonical, subResult.hasNextPrev);

      return { ...subResult, isIndexable: indexCheck.isIndexable };
    } catch (e) { return { error: true, url: subUrl, status: 'Error' }; }
  };

export const calculateHeuristicScores = (root: any, mainIndex: any) => {
    // Extract internal metrics from root
    const allImages = root.querySelectorAll('img');
    const imagesTotal = allImages.length;
    const imagesWithoutAlt = allImages.filter((img: any) => !img.getAttribute('alt') || img.getAttribute('alt').trim() === '').length;
    
    const scripts = root.querySelectorAll('script');
    const blockingScripts = scripts.filter((s: any) => !s.getAttribute('async') && !s.getAttribute('defer') && s.getAttribute('src')).length;
    const totalStylesheets = root.querySelectorAll('link[rel="stylesheet"]').length;

    const calculateMaxDepth = (node: any): number => {
      if (!node.childNodes || node.childNodes.length === 0) return 1;
      let max = 0;
      node.childNodes.forEach((child: any) => {
        if (child.nodeType === 1) max = Math.max(max, calculateMaxDepth(child));
      });
      return 1 + max;
    };
    const maxDomDepth = calculateMaxDepth(root);

    let seo = 50; 
    if (root.querySelector('title')) seo += 10;
    if (root.querySelector('meta[name="description"]')) seo += 10;
    if (root.querySelectorAll('h1').length === 1) seo += 10;
    if (imagesTotal > 0 && imagesWithoutAlt === 0) seo += 10;
    if (mainIndex.isIndexable) seo += 10;

    let performance = 100;
    if (blockingScripts > 3) performance -= 20;
    if (maxDomDepth > 30) performance -= 20;
    if (totalStylesheets > 10) performance -= 20;

    return {
      seo: Math.max(0, Math.min(100, seo)),
      performance: Math.max(0, Math.min(100, performance)),
      security: 80, // Fallback
      accessibility: 75,
      compliance: 60
    };
};

export async function performPreflight(urlObj: URL, plan: string) {
  const CRAWL_DEPTH_CONFIG: Record<string, number> = { 'free': 5, 'pro': 25, 'agency': 100 };
  const subpageLimit = CRAWL_DEPTH_CONFIG[plan] || 5;
  const domain = urlObj.hostname;

  const robotsUrl = `${urlObj.origin}/robots.txt`;
  let robotsTxt = { status: 404, content: '', allowed: true, sitemaps: [] as string[], crawlDelay: 0 };
  try {
    const res = await fetch(robotsUrl, { ...STEALTH_CONFIG, signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      robotsTxt.content = await res.text();
      robotsTxt.status = res.status;
      robotsTxt.content.split('\n').forEach(line => {
        if (line.toLowerCase().trim().startsWith('crawl-delay:')) {
          robotsTxt.crawlDelay = parseInt(line.split(/crawl-delay:/i)[1].trim()) || 0;
        }
      });
    }
  } catch (e) {}

  const sitemapUrls = await getAllUrlsBeforeCrawl(urlObj.origin, robotsTxt.content);
  const response = await fetch(urlObj.toString(), { ...STEALTH_CONFIG, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Failed to fetch URL (Status: ${response.status})`);
  
  const html = await response.text();
  const root = parse(html);
  const mainUrlNormalizedInPreflight = normalizeUrl(urlObj.toString(), urlObj.origin) || urlObj.toString();

  const initialQueue = new Set<string>();
  sitemapUrls.forEach(u => {
    const norm = normalizeUrl(u, urlObj.origin);
    if (norm && isSameBaseDomain(new URL(norm).hostname, domain) && norm !== mainUrlNormalizedInPreflight) {
      initialQueue.add(norm);
    }
  });

  return {
    subpageLimit,
    domain,
    robotsTxt,
    sitemapUrls,
    mainUrlNormalized: mainUrlNormalizedInPreflight,
    initialQueue: Array.from(initialQueue),
    html,
    headers: Object.fromEntries(response.headers.entries())
  };
}

export async function performAnalysis({ url, plan = 'free' }: ScanOptions): Promise<AnalysisResult> {
  const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
  const preflight = await performPreflight(urlObj, plan);
  const { subpageLimit, domain, robotsTxt, sitemapUrls, mainUrlNormalized, html, headers } = preflight;
  const root = parse(html);
  const ttfbMs = 0; 
  const responseTimeMs = 0;

  const rdapPromise = fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { signal: AbortSignal.timeout(10000) }).catch(() => null);

  // Headers & CDN
  const securityHeaders: Record<string, string> = {
    'Content-Security-Policy': headers['content-security-policy'] ? 'Present' : 'Missing',
    'Strict-Transport-Security': headers['strict-transport-security'] ? 'Present' : 'Missing',
    'X-Frame-Options': headers['x-frame-options'] || 'Missing',
    'X-Content-Type-Options': headers['x-content-type-options'] || 'Missing',
    'Referrer-Policy': headers['referrer-policy'] || 'Missing'
  };
  const cdn = headers['cf-ray'] ? 'Cloudflare' : headers['x-vercel-id'] ? 'Vercel' : headers['x-akamai-transformed'] ? 'Akamai' : headers['server']?.includes('Cloudfront') ? 'Amazon CloudFront' : 'None detected';

  // --- DATA EXTRACTION (MAIN PAGE) ---
  
  // Images
  const allImages = root.querySelectorAll('img');
  const imagesTotal = allImages.length;
  const imageDetails = allImages.map((img: any) => ({
    src: img.getAttribute('src') || '',
    alt: img.getAttribute('alt') || null
  }));
  const imagesWithoutAlt = imageDetails.filter(img => !img.alt || img.alt.trim() === '').length;
  const lazyImages = allImages.filter((img: any) => img.getAttribute('loading') === 'lazy' || img.getAttribute('data-src')).length;

  // Links
  const allLinks = root.querySelectorAll('a[href]');
  const internalLinks = new Set<string>();
  const externalLinks = new Set<string>();
  
  allLinks.forEach((link: any) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return;
    
    try {
      const normalized = normalizeUrl(href, urlObj.origin);
      if (normalized) {
        const targetHost = new URL(normalized).hostname;
        if (isSameBaseDomain(targetHost, domain)) {
          internalLinks.add(normalized);
        } else {
          externalLinks.add(normalized);
        }
      }
    } catch {}
  });

  // Scripts & Styles
  const scripts = root.querySelectorAll('script');
  const totalScripts = scripts.length;
  const blockingScripts = scripts.filter((s: any) => !s.getAttribute('async') && !s.getAttribute('defer') && s.getAttribute('src')).length;
  const totalStylesheets = root.querySelectorAll('link[rel="stylesheet"]').length;

  // DOM Depth
  const calculateMaxDepth = (node: any): number => {
    if (!node.childNodes || node.childNodes.length === 0) return 1;
    let max = 0;
    node.childNodes.forEach((child: any) => {
      if (child.nodeType === 1) { // Element node
        max = Math.max(max, calculateMaxDepth(child));
      }
    });
    return 1 + max;
  };
  const maxDomDepth = calculateMaxDepth(root);

  // Semantic Tags
  const semanticTags = {
    main: root.querySelectorAll('main').length,
    article: root.querySelectorAll('article').length,
    section: root.querySelectorAll('section').length,
    nav: root.querySelectorAll('nav').length,
    header: root.querySelectorAll('header').length,
    footer: root.querySelectorAll('footer').length,
    aside: root.querySelectorAll('aside').length
  };


  // Queue Engine
  const queue = new Set<string>();
  const processed = new Set<string>();
  const subpageResults: SubpageResult[] = [];

  processed.add(mainUrlNormalized);
  preflight.initialQueue.forEach(u => queue.add(u));

  internalLinks.forEach(l => {
    if (!processed.has(l)) queue.add(l);
  });

  while (queue.size > 0 && subpageResults.length < subpageLimit) {
    const current = Array.from(queue).shift()!;
    queue.delete(current);
    if (processed.has(current)) continue;
    processed.add(current);

    if (robotsTxt.crawlDelay > 0) await new Promise(r => setTimeout(r, Math.min(robotsTxt.crawlDelay * 1000, 3000)));

    const result = await scanSubpage(current, domain, robotsTxt.content);
    subpageResults.push(result);

    if (typeof result.status === 'number' && result.status >= 300 && result.status < 400 && result.redirectLocation) {
      const normTarget = normalizeUrl(result.redirectLocation, current);
      if (normTarget && isSameBaseDomain(new URL(normTarget).hostname, domain) && !processed.has(normTarget)) queue.add(normTarget);
    }

    if (!result.error && result.links) {
      result.links.forEach(l => {
        internalLinks.add(l); // Using consistent internalLinks set
        if (!processed.has(l)) queue.add(l);
      });
    }
  }

  // Final Evaluation
  const successfulSubpages = subpageResults.filter(r => !r.error).map(({ error: _, ...d }) => d);
  const htmlStripped = stripHtmlForAi(html);
  const bodyText = htmlStripped.replace(/\s+/g, ' ').trim().slice(0, 500000);

  const mainIndex = checkIndexability(urlObj.toString(), 200, root.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index, follow', headers['x-robots-tag'] || '', headers['content-type'] || '', bodyText, robotsTxt.content, root.querySelector('link[rel="canonical"]')?.getAttribute('href'), !!(root.querySelector('link[rel="next"]') || root.querySelector('link[rel="prev"]')));
  
  const indexableSubpages = successfulSubpages.filter(p => p.isIndexable);

  const crawledUrls = Array.from(processed);
  const indexableUrls = [...(mainIndex.isIndexable ? [mainUrlNormalized] : []), ...indexableSubpages.map(p => p.url)];

  const scores = calculateHeuristicScores(root, mainIndex);

  const rdapRes = await rdapPromise;
  let domainAge = "Unknown";
  if (rdapRes?.ok) {
    const data = await rdapRes.json();
    domainAge = data.events?.find((e: any) => e.eventAction === 'registration')?.eventDate.split('T')[0] || "Unknown";
  }

  return {
    audit_id: Math.random().toString(36).substring(7).toUpperCase(),
    createdAt: new Date().toISOString(),
    urlObj: mainUrlNormalized, title: root.querySelector('title')?.text.trim() || '',
    metaDescription: root.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    metaKeywords: '', htmlLang: '', hreflangs: [], generator: '', viewport: '', viewportScalable: 'Yes',
    robots: mainIndex.isIndexable ? 'index, follow' : 'noindex',
    h1Count: root.querySelectorAll('h1').length, h2Count: root.querySelectorAll('h2').length,
    imagesTotal, imagesWithoutAlt, lazyImages, maxDomDepth,
    headings: { h1: root.querySelectorAll('h1').map(el => el.text.trim()), h2: root.querySelectorAll('h2').map(el => el.text.trim()), h3: root.querySelectorAll('h3').map(el => el.text.trim()) },
    imageDetails, semanticTags,
    napSignals: { googleMapsLinks: 0, phoneLinks: 0 }, dataLeakage: { emailsFoundCount: 0, sampleEmails: [] },
    internalLinksCount: internalLinks.size, externalLinksCount: externalLinks.size, totalScripts, blockingScripts, totalStylesheets,
    responseTimeMs, ttfbMs, preflight: { robotsTxt, sitemap: { status: 200, url: null, urlsFound: sitemapUrls.length } },
    psiMetricsStr: '', psiMetrics: null, lighthouseScores: null, safeBrowsingStr: '', domainAge, sslCertificate: { status: 'READY' },
    wienerSachtextIndex: 0, bodyText, techStack: html.includes('wp-content') ? ['WordPress'] : html.includes('__NEXT_DATA__') ? ['Next.js'] : [],
    cdn, serverInfo: headers['server'] || 'Hidden',
    legal: { trackingScripts: {}, cmpDetected: {}, linksInFooter: false, privacyInFooter: false, cookieBannerFound: false },
    social: { ogTitle: '', ogDescription: '', ogImage: '', ogType: 'website', twitterCard: 'summary' },
    existingSchemaCount: 0, schemaTypes: [], securityHeaders, headers,
    crawlSummary: { 
      totalInternalLinks: internalLinks.size, 
      scannedSubpagesCount: successfulSubpages.length, 
      indexablePagesCount: indexableUrls.length,
      crawledUrls, indexableUrls,
      scannedSubpages: successfulSubpages as Omit<SubpageResult, 'error'>[], 
      brokenLinks: [] 
    },
    // AI Section Placeholders with Heuristic Scores
    seo: { score: scores.seo, insights: [], recommendations: [], detailedSeo: {} as any },
    performance: { score: scores.performance, insights: [], recommendations: [], detailedPerformance: {} as any },
    security: { score: scores.security, insights: [], recommendations: [], detailedSecurity: {} as any },
    accessibility: { score: scores.accessibility, insights: [], recommendations: [], detailedAccessibility: {} as any },
    compliance: { score: scores.compliance, insights: [], recommendations: [], detailedCompliance: {} as any },
    apiEndpoints: []
  };
}

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

/**
 * Radikal reduziert HTML auf das Wesentliche für die KI.
 */
function stripHtmlForAi(html: string): string {
  let s = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  s = s.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  s = s.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '[SVG]');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/data:[^;]+;base64,[^"']{100,}/g, '[BASE64_BLOB]');
  return s;
}

function extractInternalLinks(htmlRoot: any, baseUrl: string, domain: string): string[] {
  const links: string[] = [];
  const normalizedBase = domain.replace(/^www\./, '');
  const isSameDomain = (hostname: string) => {
    const norm = hostname.replace(/^www\./, '');
    return norm === normalizedBase;
  };

  htmlRoot.querySelectorAll('a').forEach((el: any) => {
    const href = el.getAttribute('href');
    if (href) links.push(href);
  });

  htmlRoot.querySelectorAll('link').forEach((el: any) => {
    const href = el.getAttribute('href');
    if (href) links.push(href);
  });

  const absoluteUrls = new Set<string>();
  links.forEach(href => {
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    try {
      const urlObj = new URL(href, baseUrl);
      if (isSameDomain(urlObj.hostname)) {
        const clean = urlObj.origin + urlObj.pathname + urlObj.search;
        absoluteUrls.add(clean);
      }
    } catch { /* Invalid URL */ }
  });

  return Array.from(absoluteUrls);
}

async function getPreflightData(baseUrl: string): Promise<any> {
  const url = new URL(baseUrl);
  const robotsUrl = `${url.origin}/robots.txt`;
  let robotsTxt = { status: 404, content: '', allowed: true, sitemaps: [] as string[], crawlDelay: 0 };
  
  try {
    const res = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) });
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
  for (const sUrl of robotsTxt.sitemaps) {
    try {
      const sRes = await fetch(sUrl, { signal: AbortSignal.timeout(5000) });
      if (sRes.ok) {
        const sXml = await sRes.text();
        const locMatches = sXml.match(/<loc>(.*?)<\/loc>/gi);
        if (locMatches) {
          locMatches.forEach(m => {
            const inner = m.replace(/<\/?loc>/gi, '').trim();
            if (inner.startsWith('http')) sitemapUrls.push(inner);
          });
        }
      }
    } catch (e) { /* ignore */ }
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
  const htmlPromise = fetch(urlObj.toString(), htmlRequestConfig);
  
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

  // --- Found Discovery (Level 1) ---
  const foundLinks = new Set<string>();
  preflight.sitemapUrls.forEach((u: string) => foundLinks.add(u));
  extractInternalLinks(root, urlObj.toString(), domain).forEach(u => foundLinks.add(u));

  // --- Subpage Scanning ---
  const subpagesToScan = Array.from(foundLinks).filter(u => u !== urlObj.toString()).slice(0, subpageLimit);
  
  const scanSubpage = async (subUrl: string): Promise<SubpageResult> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const subRes = await fetch(subUrl, { signal: controller.signal, headers: { 'User-Agent': 'WebsiteAnalyzerPro/1.0 (Enterprise Auditor)' } });
      clearTimeout(timeout);
      if (!subRes.ok) return { error: true, url: subUrl, status: subRes.status };
      
      const subHtml = await subRes.text();
      const subRoot = parse(subHtml);
      const strippedContent = stripHtmlForAi(subHtml).replace(/\s+/g, ' ').trim().slice(0, 15000);
      const subInternalLinks = extractInternalLinks(subRoot, subUrl, domain);

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

  const subpageResults: SubpageResult[] = [];
  if (crawlDelayMs > 0) {
    for (const subUrl of subpagesToScan) {
      const result = await scanSubpage(subUrl);
      subpageResults.push(result);
      await new Promise(resolve => setTimeout(resolve, Math.min(crawlDelayMs, 3000)));
    }
  } else {
    const BATCH_SIZE = 8; 
    for (let i = 0; i < subpagesToScan.length; i += BATCH_SIZE) {
      const batch = subpagesToScan.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(url => scanSubpage(url)));
      subpageResults.push(...results);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const successfulSubpages = subpageResults.filter(r => !r.error).map(({ error: _, ...d }) => d);
  successfulSubpages.forEach(sub => {
    (sub.links || []).forEach(l => foundLinks.add(l));
  });

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
    internalLinksCount: foundLinks.size, externalLinksCount: 0, totalScripts: 0, blockingScripts: 0, totalStylesheets: 0,
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
      totalInternalLinks: foundLinks.size, 
      scannedSubpagesCount: successfulSubpages.length, 
      indexablePagesCount,
      scannedSubpages: successfulSubpages as Omit<SubpageResult, 'error'>[], 
      brokenLinks: [] 
    },
    apiEndpoints: []
  };
}

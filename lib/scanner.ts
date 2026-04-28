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

function stripHtmlForAi(html: string): string {
  let s = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  s = s.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  s = s.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '[SVG]');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/data:[^;]+;base64,[^"']{100,}/g, '[BASE64_BLOB]');
  return s;
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
  
  const psiApiKeyParam = apiKey ? `&key=${apiKey}` : '';
  const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(urlObj.toString())}${psiApiKeyParam}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO&strategy=MOBILE`;
  const psiPromise = fetch(psiUrl, { signal: AbortSignal.timeout(45000) }).catch(() => null);

  const ttfbStart = Date.now();
  const htmlPromise = fetch(urlObj.toString(), htmlRequestConfig);
  
  let safeBrowsingPromise: Promise<Response | null> = Promise.resolve(null);
  if (apiKey) {
    const sbUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
    safeBrowsingPromise = fetch(sbUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: "wap", clientVersion: "1.0.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url: urlObj.toString() }]
        }
      }),
      signal: AbortSignal.timeout(10000)
    }).catch(() => null);
  }

  const response = await htmlPromise;
  const ttfbMs = Date.now() - ttfbStart;
  const responseTimeMs = Date.now() - startTime;

  if (!response.ok) {
    throw new Error(`Failed to fetch the URL (Status: ${response.status})`);
  }

  const html = await response.text();
  const root = parse(html);

  const headers = Object.fromEntries(response.headers.entries());
  const securityHeaders: Record<string, string> = {
    'Content-Security-Policy': headers['content-security-policy'] ? 'Present' : 'Missing',
    'Strict-Transport-Security': headers['strict-transport-security'] ? 'Present' : 'Missing',
    'X-Frame-Options': headers['x-frame-options'] || 'Missing',
    'X-Content-Type-Options': headers['x-content-type-options'] || 'Missing',
    'Referrer-Policy': headers['referrer-policy'] || 'Missing',
    'Permissions-Policy': headers['permissions-policy'] || 'Missing'
  };

  const cdn = 
    headers['cf-ray'] ? 'Cloudflare' :
    headers['x-vercel-id'] ? 'Vercel' :
    headers['x-akamai-transformed'] ? 'Akamai' :
    headers['x-fastly-request-id'] ? 'Fastly' :
    headers['x-github-request-id'] ? 'GitHub Pages' :
    headers['server']?.includes('Cloudfront') ? 'Amazon CloudFront' :
    'None detected';

  const serverInfo = headers['server'] || 'Hidden';

  const internalLinks: string[] = [];
  const seenLinks = new Set<string>();
  let externalLinksCount = 0;
  let googleMapsLinks = 0;
  let phoneLinks = 0;
  const linkSummaryList: string[] = [];
  const baseDomain = urlObj.hostname;

  const normalizedBase = baseDomain.replace(/^www\./, '');
  const isSameDomain = (hostname: string) => {
    const norm = hostname.replace(/^www\./, '');
    return norm === normalizedBase;
  };

  // Pre-fill seenLinks with start URL
  seenLinks.add(urlObj.origin + urlObj.pathname);

  preflight.sitemapUrls.forEach((sUrl: string) => {
    try {
      const sObj = new URL(sUrl);
      if (isSameDomain(sObj.hostname)) {
        const clean = sObj.origin + sObj.pathname;
        if (!seenLinks.has(clean)) {
          seenLinks.add(clean);
          internalLinks.push(clean);
        }
      }
    } catch { /* ignore */ }
  });

  root.querySelectorAll('a').forEach((el) => {
    const href = el.getAttribute('href') || '';
    const text = el.text.trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    if (href.startsWith('mailto:')) return; 
    if (href.startsWith('tel:')) { phoneLinks++; return; }
    if (href.includes('google.com/maps') || href.includes('maps.google') || href.includes('maps.app.goo.gl')) {
      googleMapsLinks++;
    }
    try {
      const absoluteUrl = new URL(href, urlObj.toString());
      if (isSameDomain(absoluteUrl.hostname)) {
        const cleanUrl = absoluteUrl.origin + absoluteUrl.pathname;
        if (!seenLinks.has(cleanUrl)) {
          seenLinks.add(cleanUrl);
          internalLinks.push(cleanUrl);
        }
      } else if (href.startsWith('http')) {
        externalLinksCount++;
      }
      if (linkSummaryList.length < 80) {
        linkSummaryList.push(`${text.slice(0, 30)} (${href.slice(0, 50)})`);
      }
    } catch { /* ignore */ }
  });

  let psiMetricsStr = "Keine PageSpeed Insights Daten verfügbar.";
  let lighthouseScores: LighthouseScores | null = null;
  let psiMetrics: PsiMetrics | null = null;
  const psiRes = await psiPromise;
  if (psiRes && psiRes.ok) {
    const psiData = await psiRes.json();
    const audits = psiData?.lighthouseResult?.audits;
    const categories = psiData?.lighthouseResult?.categories;
    if (categories) {
      lighthouseScores = {
        performance: Math.round((categories.performance?.score || 0) * 100),
        accessibility: Math.round((categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
        seo: Math.round((categories.seo?.score || 0) * 100),
      };
    }
    if (audits) {
      psiMetrics = {
        fcp: audits['first-contentful-paint']?.numericValue || null,
        lcp: audits['largest-contentful-paint']?.numericValue || null,
        tbt: audits['total-blocking-time']?.numericValue || null,
        cls: audits['cumulative-layout-shift']?.numericValue || null,
        speedIndex: audits['speed-index']?.numericValue || null,
        tti: audits['interactive']?.numericValue || null
      };
      psiMetricsStr = `Google PageSpeed Insights (Mobile): Perf: ${lighthouseScores?.performance}, Acc: ${lighthouseScores?.accessibility}, FCP: ${audits['first-contentful-paint']?.displayValue}, LCP: ${audits['largest-contentful-paint']?.displayValue}`;
    }
  }

  let safeBrowsingStr = "Nicht geprüft.";
  const sbRes = await safeBrowsingPromise;
  if (sbRes && sbRes.ok) {
    const sbData = await sbRes.json();
    safeBrowsingStr = (sbData.matches?.length > 0) ? "GEFÄHRLICH: Google Safe Browsing Warnung!" : "SICHER: Keine Bedrohungen gemeldet.";
  }

  let domainAgeStr = "Nicht gefunden";
  const rdapRes = await rdapPromise;
  if (rdapRes && rdapRes.ok) {
    const rdapData = await rdapRes.json();
    const regEvent = rdapData.events?.find((e: any) => e.eventAction === 'registration');
    if (regEvent?.eventDate) domainAgeStr = regEvent.eventDate.split('T')[0] as string;
  }

  let sslCertificateData: SslCertificateData = { status: "Not retrieved" };
  const sslRes = await sslPromise;
  if (sslRes && sslRes.ok) {
    const sslData = await sslRes.json();
    if (sslData.status === "READY" && sslData.endpoints?.[0]) {
      const endpoint = sslData.endpoints[0];
      const cert = sslData.certs?.[0];
      sslCertificateData = {
        grade: endpoint.grade || "Unknown",
        issuerSubject: cert?.issuerSubject || "Unknown",
        validUntil: cert ? new Date(cert.notAfter).toISOString().split('T')[0] : "Unknown",
        hstsPolicy: endpoint.details?.hstsPolicy?.status || "Unknown"
      };
    }
  }

  const totalScripts = root.querySelectorAll('script').length;
  const blockingScripts = totalScripts - root.querySelectorAll('script[async], script[defer]').length;
  const totalStylesheets = root.querySelectorAll('link[rel="stylesheet"]').length;
  const lazyImages = root.querySelectorAll('img[loading="lazy"]').length;
  const imagesTotal = root.querySelectorAll('img').length;
  const imagesWithoutAlt = root.querySelectorAll('img:not([alt])').length;
  const viewport = root.querySelector('meta[name="viewport"]')?.getAttribute('content') || 'Not found';
  const robots = root.querySelector('meta[name="robots"]')?.getAttribute('content') || 'Not found';
  const metaKeywords = root.querySelector('meta[name="keywords"]')?.getAttribute('content') || 'Not found';
  const generator = root.querySelector('meta[name="generator"]')?.getAttribute('content') || 'Not found';
  const htmlLang = root.querySelector('html')?.getAttribute('lang') || 'Not set';
  const hreflangs = root.querySelectorAll('link[rel="alternate"][hreflang]').map(el => ({
    hreflang: el.getAttribute('hreflang') || '',
    href: el.getAttribute('href') || ''
  }));

  const ogTitle = root.querySelector('meta[property="og:title"]')?.getAttribute('content') 
               || root.querySelector('meta[name="og:title"]')?.getAttribute('content')
               || root.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
               || root.querySelector('title')?.text.trim() || '';

  const ogDescription = root.querySelector('meta[property="og:description"]')?.getAttribute('content')
                     || root.querySelector('meta[name="og:description"]')?.getAttribute('content')
                     || root.querySelector('meta[name="twitter:description"]')?.getAttribute('content')
                     || root.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  let ogImage = root.querySelector('meta[property="og:image"]')?.getAttribute('content')
             || root.querySelector('meta[name="og:image"]')?.getAttribute('content')
             || root.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
             || root.querySelector('meta[name="twitter:image:src"]')?.getAttribute('content')
             || root.querySelector('link[rel="image_src"]')?.getAttribute('href');

  if (ogImage && !ogImage.startsWith('http')) {
    try {
      ogImage = new URL(ogImage, urlObj.toString()).toString();
    } catch { /* ignore */ }
  }

  const ogType = root.querySelector('meta[property="og:type"]')?.getAttribute('content') || 'website';
  const twitterCard = root.querySelector('meta[name="twitter:card"]')?.getAttribute('content') || 'summary';

  const subpagesToScan = internalLinks.slice(0, subpageLimit);
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
      
      // Level 2 Discovery
      const subLinks: string[] = [];
      subRoot.querySelectorAll('a').forEach(a => {
        const h = a.getAttribute('href');
        if (h && !h.startsWith('#') && !h.startsWith('javascript:')) {
          try {
            const abs = new URL(h, subUrl).toString();
            subLinks.push(abs);
          } catch { /* ignore */ }
        }
      });

      return {
        error: false, url: subUrl, title: subRoot.querySelector('title')?.text.trim() || '',
        metaDescription: subRoot.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        robots: subRoot.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index, follow',
        canonical: subRoot.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
        h1Count: subRoot.querySelectorAll('h1').length, 
        imagesWithoutAlt: subRoot.querySelectorAll('img:not([alt])').length,
        status: subRes.status,
        strippedContent,
        links: subLinks
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
  const brokenLinks = subpageResults.filter(r => r.error).map(r => ({ url: r.url, status: r.status }));

  // Recursive Discovery
  successfulSubpages.forEach(sub => {
    (sub.links || []).forEach(l => {
      try {
        const lObj = new URL(l);
        if (isSameDomain(lObj.hostname)) {
          const clean = lObj.origin + lObj.pathname;
          if (!seenLinks.has(clean)) {
            seenLinks.add(clean);
            internalLinks.push(clean);
          }
        }
      } catch { /* ignore */ }
    });
  });

  const title = root.querySelector('title')?.text.trim() || '';
  const metaDescription = root.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const htmlStripped = stripHtmlForAi(html);
  const bodyText = htmlStripped.replace(/\s+/g, ' ').trim().slice(0, 500000); 
  const h1Texts = root.querySelectorAll('h1').map(el => el.text.replace(/\s+/g, ' ').trim());
  const h2Texts = root.querySelectorAll('h2').map(el => el.text.replace(/\s+/g, ' ').trim());
  const h3Texts = root.querySelectorAll('h3').map(el => el.text.replace(/\s+/g, ' ').trim());

  const imageDetails = root.querySelectorAll('img').slice(0, 100).map(img => ({
    src: img.getAttribute('src') || '',
    alt: img.getAttribute('alt') || null
  }));

  const words = bodyText.split(/\s+/).filter(w => w.length > 0);
  const avgSentenceLength = words.length / (bodyText.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1);
  const countSyllables = (word: string) => word.toLowerCase().match(/[aeiouyäöü]{1,2}/g)?.length || 1;
  const avgSyllablesPerWord = words.reduce((acc, w) => acc + countSyllables(w), 0) / (words.length || 1);
  const wienerSachtextIndex = Math.round((0.26 * avgSentenceLength + 0.27 * (avgSyllablesPerWord * 6) - 1.69) * 10) / 10;

  const techStack: string[] = [];
  const htmlStr = html.substring(0, 500000);
  if (htmlStr.includes('__NEXT_DATA__')) techStack.push('Next.js');
  if (htmlStr.includes('wp-content') || htmlStr.includes('wp-includes')) techStack.push('WordPress');
  if (htmlStr.includes('cdn.shopify.com')) techStack.push('Shopify');
  if (htmlStr.includes('id="_nuxt"') || htmlStr.includes('window.__NUXT__')) techStack.push('Nuxt.js');
  if (htmlStr.includes('data-reactroot')) techStack.push('React');
  if (htmlStr.includes('wix-config') || htmlStr.includes('wix.com')) techStack.push('Wix');
  if (htmlStr.includes('static1.squarespace.com')) techStack.push('Squarespace');
  if (htmlStr.includes('hubspot.com')) techStack.push('HubSpot');
  if (htmlStr.includes('googletagmanager.com/gtm.js')) techStack.push('Google Tag Manager');
  if (htmlStr.includes('google-analytics.com')) techStack.push('Google Analytics');

  const apiEndpoints: string[] = [];
  if (plan !== 'free') {
    const apiPaths = ['/api', '/graphql', '/v1', '/wp-json/wp/v2'];
    await Promise.all(apiPaths.map(async (path) => {
      try {
        const testUrl = new URL(path, urlObj.toString()).toString();
        const apiRes = await fetch(testUrl, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
        if (apiRes.ok || apiRes.status === 401 || apiRes.status === 403) apiEndpoints.push(path);
      } catch { /* ignore */ }
    }));
  }

  const scriptsText = root.querySelectorAll('script').map(s => s.getAttribute('src') || s.text).join(' ');
  const cmpDetected = html.includes('cookie-consent') || html.includes('CookieConsent') || html.includes('cookiebot') || html.includes('usercentrics') || html.includes('cmp-banner');
  const links = root.querySelectorAll('a');
  const impressumLink = links.some(a => {
    const text = a.text.toLowerCase();
    const href = (a.getAttribute('href') || '').toLowerCase();
    return text.includes('impressum') || href.includes('impressum') || text.includes('legal notice');
  });
  const privacyLink = links.some(a => {
    const text = a.text.toLowerCase();
    const href = (a.getAttribute('href') || '').toLowerCase();
    return text.includes('datenschutz') || href.includes('datenschutz') || text.includes('privacy') || href.includes('privacy-policy');
  });

  const schemaTypes: string[] = [];
  root.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
    try {
      const json = JSON.parse(el.text);
      const extractTypes = (obj: any) => {
        if (obj['@type']) schemaTypes.push(obj['@type'] as string);
        if (obj['@graph'] && Array.isArray(obj['@graph'])) {
          obj['@graph'].forEach((item: any) => { if (item['@type']) schemaTypes.push(item['@type'] as string); });
        }
      };
      extractTypes(json);
    } catch { /* ignore */ }
  });

  const mainIsIndexable = !robots.toLowerCase().includes('noindex');
  const indexableSubpagesCount = successfulSubpages.filter(p => !p.robots?.toLowerCase().includes('noindex')).length;
  const indexablePagesCount = (mainIsIndexable ? 1 : 0) + indexableSubpagesCount;

  return {
    audit_id: Math.random().toString(36).substring(7).toUpperCase(),
    createdAt: new Date().toISOString(),
    urlObj: urlObj.toString(), title, metaDescription, metaKeywords, htmlLang, hreflangs, generator, viewport,
    viewportScalable: viewport.includes('user-scalable=no') ? 'No' : 'Yes',
    robots, h1Count: h1Texts.length, h2Count: h2Texts.length, imagesTotal, imagesWithoutAlt, lazyImages, 
    maxDomDepth: 0, 
    headings: { h1: h1Texts, h2: h2Texts, h3: h3Texts },
    imageDetails,
    semanticTags: { 
      main: root.querySelectorAll('main').length, 
      article: root.querySelectorAll('article').length, 
      section: root.querySelectorAll('section').length, 
      nav: root.querySelectorAll('nav').length,
      header: root.querySelectorAll('header').length,
      footer: root.querySelectorAll('footer').length,
      aside: root.querySelectorAll('aside').length
    },
    napSignals: { googleMapsLinks, phoneLinks },
    dataLeakage: { 
      emailsFoundCount: (bodyText.match(/\b[\w.%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) || []).length,
      sampleEmails: (bodyText.match(/\b[\w.%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) || []).slice(0, 3)
    },
    internalLinksCount: internalLinks.length, externalLinksCount, totalScripts, blockingScripts, totalStylesheets,
    responseTimeMs, ttfbMs, preflight, psiMetricsStr, psiMetrics, lighthouseScores, safeBrowsingStr, domainAge: domainAgeStr, sslCertificate: sslCertificateData,
    wienerSachtextIndex, bodyText, techStack,
    cdn,
    serverInfo,
    legal: {
      trackingScripts: {
        googleAnalytics: scriptsText.includes('googletagmanager.com/gtm.js') || scriptsText.includes('google-analytics.com'),
        facebookPixel: scriptsText.includes('facebook.net/en_US/fbevents.js'),
        hubspot: scriptsText.includes('js.hs-scripts.com') || scriptsText.includes('js.hubspot.com'),
        hotjar: scriptsText.includes('hotjar.com'),
        clarity: scriptsText.includes('clarity.ms')
      },
      cmpDetected: {
        cookieBot: html.includes('cookiebot'),
        usercentrics: html.includes('usercentrics'),
        cookieConsent: html.includes('cookie-consent') || html.includes('CookieConsent'),
        borlabs: html.includes('borlabs')
      },
      linksInFooter: impressumLink,
      privacyInFooter: privacyLink,
      cookieBannerFound: cmpDetected
    },
    social: {
      ogTitle,
      ogDescription,
      ogImage: ogImage || '',
      ogType,
      twitterCard
    },
    existingSchemaCount: schemaTypes.length,
    schemaTypes: Array.from(new Set(schemaTypes)),
    securityHeaders,
    headers,
    crawlSummary: { 
      totalInternalLinks: seenLinks.size, 
      scannedSubpagesCount: successfulSubpages.length, 
      indexablePagesCount,
      scannedSubpages: successfulSubpages as Omit<SubpageResult, 'error'>[], 
      brokenLinks 
    },
    apiEndpoints
  };
}

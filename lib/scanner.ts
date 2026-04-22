import * as cheerio from 'cheerio';

export interface ScanOptions {
  url: string;
  plan?: string;
}

export async function performAnalysis({ url, plan = 'free' }: ScanOptions) {
  const PLAN_LIMITS: Record<string, number> = {
    'free': 0,
    'pro': 20,
    'agency': 100
  };
  const subpageLimit = PLAN_LIMITS[plan] || 0;

  const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
  const domain = urlObj.hostname;
  const apiKey = process.env.GOOGLE_API_KEY;

  const startTime = Date.now();
  
  const htmlRequestConfig = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  };
  
  // Start fetches in parallel
  const rdapPromise = fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
    signal: AbortSignal.timeout(10000)
  }).catch(() => null);

  const sslPromise = fetch(`https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(domain)}&publish=off&all=done`, {
    signal: AbortSignal.timeout(10000)
  }).catch(() => null);
  
  const jinaPromise = fetch(`https://r.jinaread.er.ai/${encodeURIComponent(urlObj.toString())}`, {
    headers: { 'Accept': 'text/plain' },
    signal: AbortSignal.timeout(10000)
  }).catch(() => null);
  
  const psiApiKeyParam = apiKey ? `&key=${apiKey}` : '';
  const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(urlObj.toString())}${psiApiKeyParam}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO&strategy=MOBILE`;
  const psiPromise = fetch(psiUrl, { signal: AbortSignal.timeout(45000) }).catch(() => null);

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
  const responseTimeMs = Date.now() - startTime;

  if (!response.ok) {
    throw new Error(`Failed to fetch the URL (Status: ${response.status})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // --- Header Analysis & CDN Detection ---
  const headers = Object.fromEntries(response.headers.entries());
  const securityHeaders = {
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

  // Optimized O(N) DOM depth calculation
  let maxDomDepth = 0;
  function calculateDepth(element: cheerio.Element, currentDepth: number) {
    if (currentDepth > maxDomDepth) maxDomDepth = currentDepth;
    const children = $(element).children();
    children.each((_, child) => {
      calculateDepth(child as cheerio.Element, currentDepth + 1);
    });
  }
  $('html').each((_, el) => calculateDepth(el as cheerio.Element, 1));

  // Unified Link Extraction
  const internalLinks: string[] = [];
  const seenLinks = new Set<string>();
  let externalLinksCount = 0;
  let googleMapsLinks = 0;
  let phoneLinks = 0;
  const linkSummaryList: string[] = [];
  const baseDomain = urlObj.hostname;

  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    
    if (href.startsWith('mailto:')) return; // handled separately via data leakage
    if (href.startsWith('tel:')) { phoneLinks++; return; }
    if (href.includes('google.com/maps') || href.includes('maps.google') || href.includes('maps.app.goo.gl')) {
      googleMapsLinks++;
    }

    try {
      const absoluteUrl = new URL(href, urlObj.toString());
      if (absoluteUrl.hostname === baseDomain) {
        const cleanUrl = absoluteUrl.origin + absoluteUrl.pathname;
        if (!seenLinks.has(cleanUrl) && cleanUrl !== urlObj.origin + urlObj.pathname) {
          seenLinks.add(cleanUrl);
          internalLinks.push(cleanUrl);
        }
      } else if (href.startsWith('http')) {
        externalLinksCount++;
      }
      
      if (linkSummaryList.length < 80) {
        linkSummaryList.push(`${text.slice(0, 30)} (${href.slice(0, 50)})`);
      }
    } catch (e) {}
  });

  // Process other parallel results
  let psiMetricsStr = "Keine PageSpeed Insights Daten verfügbar.";
  let lighthouseScores = null;
  let psiMetrics: any = null;
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

  // Safe Browsing
  let safeBrowsingStr = "Nicht geprüft.";
  const sbRes = await safeBrowsingPromise;
  if (sbRes && sbRes.ok) {
    const sbData = await sbRes.json();
    safeBrowsingStr = (sbData.matches?.length > 0) ? "GEFÄHRLICH: Google Safe Browsing Warnung!" : "SICHER: Keine Bedrohungen gemeldet.";
  }

  // Domain & SSL
  let domainAgeStr = "Nicht gefunden";
  const rdapRes = await rdapPromise;
  if (rdapRes && rdapRes.ok) {
    const rdapData = await rdapRes.json();
    const regEvent = rdapData.events?.find((e: any) => e.eventAction === 'registration');
    if (regEvent?.eventDate) domainAgeStr = regEvent.eventDate.split('T')[0];
  }

  let sslCertificateData: any = { status: "Not retrieved" };
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

  // Metadata & Stats
  const totalScripts = $('script').length;
  const blockingScripts = totalScripts - $('script[async], script[defer]').length;
  const totalStylesheets = $('link[rel="stylesheet"]').length;
  const lazyImages = $('img[loading="lazy"]').length;
  const imagesTotal = $('img').length;
  const imagesWithoutAlt = $('img:not([alt]), img[alt=""]').length;
  const viewport = $('meta[name="viewport"]').attr('content') || 'Not found';
  const robots = $('meta[name="robots"]').attr('content') || 'Not found';
  const metaKeywords = $('meta[name="keywords"]').attr('content') || 'Not found';
  const generator = $('meta[name="generator"]').attr('content') || 'Not found';
  const htmlLang = $('html').attr('lang') || 'Not set';
  const ariaCount = $('[aria-hidden], [aria-label], [role]').length;
  const emptyButtonsLinks = $('button:empty, a:empty').length;
  const canonical = $('link[rel="canonical"]').attr('href') || 'Not found';

  // OpenGraph & Social
  const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content');
  const ogDescription = $('meta[property="og:description"]').attr('content') || $('meta[name="twitter:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
  const ogType = $('meta[property="og:type"]').attr('content');
  const twitterCard = $('meta[name="twitter:card"]').attr('content');

  // Subpage Scanning
  const subpagesToScan = internalLinks.slice(0, subpageLimit);
  const scanSubpage = async (subUrl: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s limit per subpage

    try {
      const subRes = await fetch(subUrl, { 
        signal: controller.signal,
        headers: { 'User-Agent': 'WebsiteAnalyzerPro/1.0 (Enterprise Auditor)' }
      });
      clearTimeout(timeout);
      if (!subRes.ok) return { error: true, url: subUrl, status: subRes.status };
      const subHtml = await subRes.text();
      const $s = cheerio.load(subHtml);
      return {
        error: false, url: subUrl, title: $s('title').text().trim(),
        metaDescription: $s('meta[name="description"]').attr('content') || '',
        h1Count: $s('h1').length, imagesWithoutAlt: $s('img:not([alt]), img[alt=""]').length,
        status: subRes.status
      };
    } catch (e) { return { error: true, url: subUrl, status: 'Error' }; }
  };

  const subpageResults = await Promise.all(subpagesToScan.map(url => scanSubpage(url)));
  const successfulSubpages = subpageResults.filter(r => !r.error).map(({ error, ...d }: any) => d);
  const brokenLinks = subpageResults.filter(r => r.error).map(r => ({ url: r.url, status: r.status }));

  // Text Audit (Cleaned)
  $('script, style, noscript, iframe, svg, video, audio').remove();
  const title = $('title').text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 15000);
  const h1Count = $('h1').length;
  const h2Count = $('h2').length;

  // Simple Wiener Sachtextformel (approximation for German)
  const words = bodyText.split(/\s+/).filter(w => w.length > 0);
  const avgSentenceLength = words.length / (bodyText.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1);
  const countSyllables = (word: string) => word.toLowerCase().match(/[aeiouyäöü]{1,2}/g)?.length || 1;
  const avgSyllablesPerWord = words.reduce((acc, w) => acc + countSyllables(w), 0) / (words.length || 1);
  const wienerSachtextIndex = Math.round((0.26 * avgSentenceLength + 0.27 * (avgSyllablesPerWord * 6) - 1.69) * 10) / 10;

  // --- Enhanced Tech Stack Detection ---
  const techStack: string[] = [];
  if (html.includes('__NEXT_DATA__')) techStack.push('Next.js');
  if (html.includes('wp-content') || html.includes('wp-includes')) techStack.push('WordPress');
  if (html.includes('cdn.shopify.com')) techStack.push('Shopify');
  if (html.includes('id="_nuxt"') || html.includes('window.__NUXT__')) techStack.push('Nuxt.js');
  if (html.includes('data-reactroot')) techStack.push('React');
  if (html.includes('wix-config') || html.includes('wix.com')) techStack.push('Wix');
  if (html.includes('static1.squarespace.com')) techStack.push('Squarespace');
  if (html.includes('hubspot.com')) techStack.push('HubSpot');
  if (html.includes('googletagmanager.com/gtm.js')) techStack.push('Google Tag Manager');
  if (html.includes('google-analytics.com')) techStack.push('Google Analytics');

  // --- Deep Schema.org Extraction ---
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text());
      const extractTypes = (obj: any) => {
        if (obj['@type']) schemaTypes.push(obj['@type']);
        if (obj['@graph'] && Array.isArray(obj['@graph'])) {
          obj['@graph'].forEach((item: any) => { if (item['@type']) schemaTypes.push(item['@type']); });
        }
      };
      extractTypes(json);
    } catch (e) {}
  });

  // Final structure
  return {
    urlObj: urlObj.toString(), title, metaDescription, metaKeywords, htmlLang, generator, viewport,
    viewportScalable: viewport.includes('user-scalable=no') ? 'No' : 'Yes',
    robots, h1Count, h2Count, imagesTotal, imagesWithoutAlt, lazyImages, maxDomDepth,
    semanticTags: { main: $('main').length, article: $('article').length, section: $('section').length, nav: $('nav').length },
    napSignals: { googleMapsLinks, phoneLinks },
    dataLeakage: { 
      emailsFoundCount: (bodyText.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g) || []).length,
      sampleEmails: (bodyText.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g) || []).slice(0, 3)
    },
    internalLinksCount: internalLinks.length, externalLinksCount, totalScripts, blockingScripts, totalStylesheets,
    responseTimeMs, psiMetricsStr, lighthouseScores, safeBrowsingStr, domainAge: domainAgeStr, sslCertificate: sslCertificateData,
    wienerSachtextIndex, bodyText, techStack,
    cdn,
    serverInfo,
    social: {
      ogTitle,
      ogDescription,
      ogImage,
      ogType,
      twitterCard
    },
    existingSchemaCount: schemaTypes.length,
    schemaTypes: Array.from(new Set(schemaTypes)),
    securityHeaders,
    headers: rawHeaders,
    crawlSummary: { totalInternalLinks: internalLinks.length, scannedSubpagesCount: successfulSubpages.length, scannedSubpages: successfulSubpages, brokenLinks }
  };
}

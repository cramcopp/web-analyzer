import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const domain = urlObj.hostname;
    const apiKey = process.env.GOOGLE_API_KEY;

    const startTime = Date.now();
    
    // Parallel fetching: App HTML + Google PageSpeed Insights API + Google Safe Browsing
    const htmlRequestConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };
    
    const psiApiKeyParam = apiKey ? `&key=${apiKey}` : '';
    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(urlObj.toString())}${psiApiKeyParam}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO&strategy=MOBILE`;

    const htmlPromise = fetch(urlObj.toString(), htmlRequestConfig);
    const psiPromise = fetch(psiUrl);
    
    let safeBrowsingPromise = Promise.resolve(null);
    if (apiKey) {
      const sbUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
      safeBrowsingPromise = fetch(sbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: "aurascan", clientVersion: "1.0.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: urlObj.toString() }]
          }
        })
      });
    }

    // Wait for the HTML primarily
    const response = await htmlPromise;
    const responseTimeMs = Date.now() - startTime;

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch the URL (Status: ${response.status})` }, { status: response.status });
    }

    const html = await response.text();

    // Process PSI data
    let psiMetricsStr = "Keine PageSpeed Insights Daten verfügbar.";
    let lighthouseScores = null;
    try {
      const psiTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('PSI Timeout')), 45000));
      const psiResult: any = await Promise.race([psiPromise, psiTimeout]);
      
      if (psiResult.ok) {
        const psiData = await psiResult.json();
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
          psiMetricsStr = `
            Google PageSpeed Insights (Mobile):
            Lighthouse Performance Score: ${lighthouseScores?.performance}/100
            Accessibility Score: ${lighthouseScores?.accessibility}/100
            Best Practices Score: ${lighthouseScores?.bestPractices}/100
            SEO Score: ${lighthouseScores?.seo}/100
            FCP: ${audits['first-contentful-paint']?.displayValue}
            LCP: ${audits['largest-contentful-paint']?.displayValue}
            TBT: ${audits['total-blocking-time']?.displayValue}
            CLS: ${audits['cumulative-layout-shift']?.displayValue}
          `;
        }
      }
    } catch (e) {
      console.warn("Google PageSpeed API failed or timed out:", e);
    }

    // Process Safe Browsing
    let safeBrowsingStr = "Nicht geprüft (Fehlender API-Key).";
    try {
      const sbResult = await safeBrowsingPromise;
      if (sbResult && sbResult.ok) {
        const sbData = await sbResult.json();
        if (sbData.matches && sbData.matches.length > 0) {
          safeBrowsingStr = "GEFÄHRLICH: Diese Website wurde von Google Safe Browsing als riskant (Malware/Phishing) eingestuft!";
        } else {
          safeBrowsingStr = "SICHER: Google Safe Browsing meldet keine Bedrohungen.";
        }
      }
    } catch (e) {
      console.warn("Safe Browsing API failed:", e);
    }

    // Parse HTML with cheerio to extract relevant content and reduce tokens
    const $ = cheerio.load(html);
    
    // Extract performance indicators BEFORE removing tags
    const totalScripts = $('script').length;
    const asyncScripts = $('script[async], script[defer]').length;
    const blockingScripts = totalScripts - asyncScripts;
    const totalStylesheets = $('link[rel="stylesheet"]').length;
    const lazyImages = $('img[loading="lazy"]').length;
    
    // Calculate max DOM depth
    let maxDomDepth = 0;
    $('*').each((i, el) => {
      const depth = $(el).parents().length;
      if (depth > maxDomDepth) maxDomDepth = depth;
    });

    // Perfectionist Performance Signals
    const preloads = {
      fonts: $('link[rel="preload"][as="font"]').length,
      dnsPrefetch: $('link[rel="dns-prefetch"]').length,
      preconnect: $('link[rel="preconnect"]').length,
    };
    
    let hasNextGenImages = false;
    $('img').each((i, el) => {
      const src = $(el).attr('src') || '';
      if(src.toLowerCase().includes('.webp') || src.toLowerCase().includes('.avif')) {
        hasNextGenImages = true;
      }
    });
    const nextGenImagesSource = $('source[type="image/webp"], source[type="image/avif"]').length;
    if (nextGenImagesSource > 0) hasNextGenImages = true;

    // Semantic Tags Audit
    const semanticTags = {
      main: $('main').length,
      article: $('article').length,
      section: $('section').length,
      aside: $('aside').length,
      nav: $('nav').length,
      header: $('header').length,
      footer: $('footer').length,
    };
    
    // Check for exposed emails (basic data leakage check)
    const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
    const emailsFound = [...new Set(html.match(emailRegex) || [])];
    const mailtoLinks = $('a[href^="mailto:"]').length;
    
    const viewport = $('meta[name="viewport"]').attr('content') || 'Not found';
    const robots = $('meta[name="robots"]').attr('content') || 'Not found';
    const metaKeywords = $('meta[name="keywords"]').attr('content') || 'Not found';
    const generator = $('meta[name="generator"]').attr('content') || 'Not found';
    const imagesTotal = $('img').length;
    const imagesWithoutAlt = $('img:not([alt]), img[alt=""]').length;

    // Extract A11y metrics
    const htmlLang = $('html').attr('lang') || 'Not set';
    const ariaCount = $('[aria-hidden], [aria-label], [role]').length;
    const emptyButtonsLinks = $('button:empty, a:empty').length;
    const viewportScalable = viewport.includes('user-scalable=no') || viewport.includes('maximum-scale=1') ? 'No (Zoom disabled - BAD)' : 'Yes';
    const canonical = $('link[rel="canonical"]').attr('href') || 'Not found';

    // Extract hreflang tags
    const hreflangs: { lang: string; href: string }[] = [];
    $('link[rel="alternate"][hreflang]').each((i, el) => {
      hreflangs.push({
        lang: $(el).attr('hreflang') || '',
        href: $(el).attr('href') || ''
      });
    });

    // Try to detect Sitemap/Robots more deeply
    let robotsTxtFound = false;
    let sitemapMentionedInRobots = false;
    try {
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const robotsResponse = await fetch(robotsUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (robotsResponse.ok) {
        robotsTxtFound = true;
        const robotsContent = await robotsResponse.text();
        sitemapMentionedInRobots = robotsContent.toLowerCase().includes('sitemap:');
      }
    } catch (e) {
      // Ignore failures
    }

    let formsCount = 0;
    const formDetails: string[] = [];
    $('form').each((i, el) => {
      formsCount++;
      if (formsCount <= 5) { // Limit to avoid prompt bloat
        const action = $(el).attr('action') || 'none';
        const method = $(el).attr('method') || 'GET';
        const inputs = $(el).find('input, textarea, select').length;
        formDetails.push(`Form ${i+1}: method=${method}, action=${action}, inputs=${inputs}`);
      }
    });
    
    // Extract Legal Compliance indicators
    const impressesumLink = $('a').filter((i, el) => $(el).text().toLowerCase().includes('impressum') || ($(el).attr('href') || '').toLowerCase().includes('impressum')).length > 0;
    const privacyLink = $('a').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      const href = ($(el).attr('href') || '').toLowerCase();
      return text.includes('datenschutz') || text.includes('privacy') || href.includes('datenschutz') || href.includes('privacy');
    }).length > 0;
    const tosLink = $('a').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      const href = ($(el).attr('href') || '').toLowerCase();
      return text.includes('agb') || text.includes('nutzungsbedingungen') || text.includes('terms') || href.includes('agb') || href.includes('terms');
    }).length > 0;
    
    // Check if legal links are in footer (prominence check)
    const linksInFooter = $('footer a').length > 0;
    const privacyInFooter = $('footer a').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      const href = ($(el).attr('href') || '').toLowerCase();
      return text.includes('datenschutz') || text.includes('privacy') || href.includes('datenschutz') || href.includes('privacy');
    }).length > 0;

    // Detect common tracking scripts
    const trackingScripts = {
      googleAnalytics: html.includes('googletagmanager.com/gtag/js') || html.includes('google-analytics.com/analytics.js'),
      facebookPixel: html.includes('connect.facebook.net/en_US/fbevents.js') || html.includes('fbq('),
      hotjar: html.includes('static.hotjar.com'),
      linkedinInsight: html.includes('snap.licdn.com/li.lms-analytics/insight.min.js')
    };

    // Aggregate all script text to check for globals and events
    const allScriptText = $('script').map((i, el) => $(el).html()).get().join(' ');

    // Detect common CMPs (Consent Management Platforms)
    const cmpDetected = {
      usercentrics: html.includes('app.usercentrics.eu') || !!$('[id*="usercentrics"]').length || allScriptText.includes('window.UC_UI'),
      cookiebot: html.includes('cookiebot.com') || allScriptText.includes('Cookiebot') || allScriptText.includes('CookieConsent'),
      borlabs: html.includes('borlabs-cookie') || !!$('[id*="borlabs"]').length || allScriptText.includes('BorlabsCookie') || allScriptText.includes('borlabsCookie'),
      consentManager: html.includes('cdn.consentmanager.mgr.consens.org') || html.includes('consentmanager.net'),
      oneTrust: html.includes('onetrust.com') || allScriptText.includes('OptanonWrapper') || allScriptText.includes('OnetrustActiveGroups'),
      klaro: html.includes('klaro.js') || allScriptText.includes('klaroConfig'),
      tcfApi: allScriptText.includes('__tcfapi(') || allScriptText.includes('__tcfapiLocator') || allScriptText.includes('__cmp('),
      tarteaucitron: html.includes('tarteaucitron') || allScriptText.includes('tarteaucitron')
    };

    // Simple heuristic for cookie banner including JS event listener patterns
    const hasConsentJsPatterns = 
      allScriptText.includes('addEventListener("CookiebotOnAccept"') ||
      allScriptText.includes('addEventListener("consent"') ||
      allScriptText.includes('onConsentChange') ||
      allScriptText.includes('cookie-consent');

    const cookieBannerFound = hasConsentJsPatterns || html.toLowerCase().includes('cookie') && (
      html.toLowerCase().includes('akzeptieren') || 
      html.toLowerCase().includes('einwilligen') || 
      html.toLowerCase().includes('accept') ||
      html.toLowerCase().includes('zustimmen') ||
      !!$('[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i]').length ||
      Object.values(cmpDetected).some(v => v)
    );

    // Extract OpenGraph/Social metadata
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogType = $('meta[property="og:type"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';
    
    // Existing Schema Detection
    const existingJsonLdCount = $('script[type="application/ld+json"]').length;

    // Remove heavy tags for body text extraction
    $('script, style, noscript, iframe, svg, video, audio').remove();
    
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 15000); // limit to 15k chars
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;

    // Content Audit: Identical Headings
    const h1s: string[] = [];
    $('h1').each((i, el) => { h1s.push($(el).text().trim()); });
    const h2s: string[] = [];
    $('h2').each((i, el) => { h2s.push($(el).text().trim()); });
    
    const duplicateH1s = h1s.length > 1;
    const duplicateH2s = new Set(h2s).size !== h2s.length;
    const identicalHeadings = h1s.some(h => h2s.includes(h));

    // Basic Readability Analysis (Flesch Reading Ease Heuristic)
    const words = bodyText.split(/\s+/).filter(w => w.length > 0);
    const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const countSyllables = (word: string) => {
      word = word.toLowerCase();
      if (word.length <= 3) return 1;
      word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
      const vowels = word.match(/[aeiouy]{1,2}/g);
      return vowels ? vowels.length : 1;
    };

    const totalWords = words.length;
    const totalSentences = sentences.length || 1;
    const totalSyllables = words.reduce((acc, w) => acc + countSyllables(w), 0);

    // Flesch Reading Ease Formula: 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords)
    const avgSentenceLength = totalWords / totalSentences;
    const avgSyllablesPerWord = totalSyllables / (totalWords || 1);
    const fleschScore = Math.max(0, Math.min(100, Math.round(206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord))));
    
    // Detailed Link Analysis
    let internalLinksCount = 0;
    let externalLinksCount = 0;
    const links: string[] = [];
    
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href) {
        if (href.startsWith('http') && !href.includes(domain)) {
          externalLinksCount++;
        } else {
          internalLinksCount++;
        }
        if (links.length < 80) links.push(`${text} (${href})`);
      }
    });
    const linkSummary = links.join(', ');

    // NAP & Maps Check (Local SEO signals)
    const googleMapsLinks = $('a[href*="google.com/maps"], a[href*="maps.google"], a[href*="maps.app.goo.gl"]').length;
    const phoneLinks = $('a[href^="tel:"]').length;
    
    // Call-to-Action (CTA) Detection
    const ctaTexts: string[] = [];
    $('a[class*="btn"], a[class*="button"], button, input[type="submit"]').each((i, el) => {
      const text = $(el).text().trim() || $(el).attr('value')?.trim();
      if (text && ctaTexts.length < 15) {
        ctaTexts.push(text);
      }
    });

    // Extract precise security headers and tech stack headers
    const securityHeaders = {
      hsts: response.headers.get('strict-transport-security') || 'Missing',
      csp: response.headers.get('content-security-policy') || 'Missing',
      xContentTypeOptions: response.headers.get('x-content-type-options') || 'Missing',
      xFrameOptions: response.headers.get('x-frame-options') || 'Missing',
      xPoweredBy: response.headers.get('x-powered-by') || 'Hidden',
      server: response.headers.get('server') || 'Hidden',
    };

    // Get all response headers for fallback
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return NextResponse.json({
      urlObj: urlObj.toString(),
      title,
      metaDescription,
      metaKeywords,
      htmlLang,
      generator,
      viewport,
      viewportScalable,
      robots,
      formsCount,
      formDetails,
      h1Count,
      h2Count,
      imagesTotal,
      imagesWithoutAlt,
      lazyImages,
      maxDomDepth,
      semanticTags,
      napSignals: {
        googleMapsLinks,
        phoneLinks
      },
      ctaTexts,
      dataLeakage: {
        emailsFoundCount: emailsFound?.length || 0,
        mailtoLinksCount: mailtoLinks,
        sampleEmails: emailsFound.slice(0, 3)
      },
      ariaCount,
      emptyButtonsLinks,
      internalLinksCount,
      externalLinksCount,
      totalScripts,
      blockingScripts,
      totalStylesheets,
      responseTimeMs,
      preloads,
      hasNextGenImages,
      psiMetricsStr,
      lighthouseScores,
      safeBrowsingStr,
      securityHeaders,
      headers,
      linkSummary,
      bodyText,
      fleschScore,
      contentAudit: {
        duplicateH1s,
        duplicateH2s,
        identicalHeadings
      },
      legal: {
        impressesumLink,
        privacyLink,
        tosLink,
        cookieBannerFound,
        linksInFooter,
        privacyInFooter,
        trackingScripts,
        cmpDetected
      },
      technicalSeo: {
        canonical,
        robotsTxtFound,
        sitemapMentionedInRobots,
        hreflangs
      },
      social: {
        ogTitle,
        ogType,
        ogImage,
        ogDescription
      },
      existingSchemaCount: existingJsonLdCount
    });

  } catch (error: any) {
    console.error("API Analysis Error:", error);
    return NextResponse.json({ error: error.message || 'Server error occurred during analysis.' }, { status: 500 });
  }
}

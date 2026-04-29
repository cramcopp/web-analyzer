// @ts-ignore
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { 
  performPreflight, 
  scanSubpage, 
  calculateHeuristicScores, 
  normalizeUrl,
  isSameBaseDomain
} from './scanner';
import { setDocument } from './firestore-edge';
import { AnalysisResult, ScanOptions, SubpageResult } from './scanner/types';
import { parse } from 'node-html-parser';

export interface Env {
  SCAN_WORKFLOW: WorkflowEntrypoint;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_ID: string;
  FIREBASE_API_KEY: string;
}

export class ScanWorkflow extends WorkflowEntrypoint<Env, ScanOptions> {
  async run(event: WorkflowEvent<ScanOptions>, step: WorkflowStep) {
    const { url, plan = 'free' } = event.payload;
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    
    // STEP 1: Preflight & Root Scan
    const preflightData = await step.do('preflight and root scan', async () => {
      const preflight = await performPreflight(urlObj, plan);
      return {
        ...preflight,
        // We can't return circular structures or complex objects like 'root'
        // So we return the raw HTML and re-parse if needed, or extract what we need
      };
    });

    const root = parse(preflightData.html);
    const mainIndex = await step.do('main indexability check', async () => {
        // Re-calculate main indexability in this step
        // We need to import checkIndexability or use it here
        const { checkIndexability, stripHtmlForAi } = await import('./scanner');
        const htmlStripped = stripHtmlForAi(preflightData.html);
        const bodyText = htmlStripped.replace(/\s+/g, ' ').trim().slice(0, 500000);
        return checkIndexability(
            preflightData.mainUrlNormalized, 
            200, 
            root.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index, follow', 
            preflightData.headers['x-robots-tag'] || '', 
            preflightData.headers['content-type'] || '', 
            bodyText, 
            preflightData.robotsTxt.content, 
            root.querySelector('link[rel="canonical"]')?.getAttribute('href'), 
            !!(root.querySelector('link[rel="next"]') || root.querySelector('link[rel="prev"]'))
        );
    });

    // STEP 2: Iteratives Crawling
    let currentState = await step.do('initialize state', async () => {
      return {
        queue: preflightData.initialQueue as string[],
        processed: [preflightData.mainUrlNormalized] as string[],
        results: [] as any[]
      };
    });

    while (currentState.queue.length > 0 && currentState.results.length < preflightData.subpageLimit) {
      const currentBatch = currentState.queue.slice(0, 5);
      
      currentState = await step.do(`batch-process-${currentState.results.length}`, async () => {
        const p = currentBatch.map((u: string) => scanSubpage(u, preflightData.domain, preflightData.robotsTxt.content));
        const scanResults = await Promise.all(p);
        
        const validResults = scanResults.filter((r: any) => !r.error);
        const newProcessed = [...currentState.processed, ...currentBatch];
        const newDiscovered: string[] = [];

        validResults.forEach((r: any) => {
          if (r.links) {
            r.links.forEach((l: string) => {
              if (!newProcessed.includes(l)) newDiscovered.push(l);
            });
          }
        });

        const remainingQueue = currentState.queue.filter((u: string) => !currentBatch.includes(u));
        
        return {
          results: [...currentState.results, ...validResults],
          processed: Array.from(new Set([...newProcessed, ...newDiscovered])),
          queue: Array.from(new Set([...remainingQueue, ...newDiscovered]))
        };
      });
    }

    // STEP 3: Scoring & Final Report
    const finalReport = await step.do('finalize report', async () => {
      const allImages = root.querySelectorAll('img');
      const imagesTotal = allImages.length;
      const imageDetails = allImages.map((img: any) => ({
        src: img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || null
      }));
      const imagesWithoutAlt = imageDetails.filter(img => !img.alt || img.alt.trim() === '').length;
      
      const scripts = root.querySelectorAll('script');
      const totalScripts = scripts.length;
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

      const scores = calculateHeuristicScores(root, mainIndex);
      
      const indexableUrls = [...(mainIndex.isIndexable ? [preflightData.mainUrlNormalized] : []), ...currentState.results.filter((r: any) => r.isIndexable).map((r: any) => r.url)];

      const semanticTags = {
        main: root.querySelectorAll('main').length,
        article: root.querySelectorAll('article').length,
        section: root.querySelectorAll('section').length,
        nav: root.querySelectorAll('nav').length,
        header: root.querySelectorAll('header').length,
        footer: root.querySelectorAll('footer').length,
        aside: root.querySelectorAll('aside').length
      };

      const securityHeaders: Record<string, string> = {
        'Content-Security-Policy': preflightData.headers['content-security-policy'] ? 'Present' : 'Missing',
        'Strict-Transport-Security': preflightData.headers['strict-transport-security'] ? 'Present' : 'Missing',
        'X-Frame-Options': preflightData.headers['x-frame-options'] || 'Missing',
        'X-Content-Type-Options': preflightData.headers['x-content-type-options'] || 'Missing',
        'Referrer-Policy': preflightData.headers['referrer-policy'] || 'Missing'
      };

      const cdn = preflightData.headers['cf-ray'] ? 'Cloudflare' : preflightData.headers['x-vercel-id'] ? 'Vercel' : preflightData.headers['x-akamai-transformed'] ? 'Akamai' : preflightData.headers['server']?.includes('Cloudfront') ? 'Amazon CloudFront' : 'None detected';

      const report: AnalysisResult = {
        audit_id: Math.random().toString(36).substring(7).toUpperCase(),
        userId: event.payload.userId || '',
        createdAt: new Date().toISOString(),
        urlObj: preflightData.mainUrlNormalized,
        title: root.querySelector('title')?.text.trim() || '',
        metaDescription: root.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        metaKeywords: '',
        htmlLang: root.querySelector('html')?.getAttribute('lang') || '',
        generator: root.querySelector('meta[name="generator"]')?.getAttribute('content') || '',
        viewport: root.querySelector('meta[name="viewport"]')?.getAttribute('content') || '',
        viewportScalable: 'Yes',
        robots: mainIndex.isIndexable ? 'index, follow' : 'noindex',
        h1Count: root.querySelectorAll('h1').length,
        h2Count: root.querySelectorAll('h2').length,
        imagesTotal,
        imagesWithoutAlt,
        lazyImages: allImages.filter((img: any) => img.getAttribute('loading') === 'lazy' || img.getAttribute('data-src')).length,
        maxDomDepth,
        semanticTags,
        headings: {
            h1: root.querySelectorAll('h1').map((el: any) => el.text.trim()),
            h2: root.querySelectorAll('h2').map((el: any) => el.text.trim()),
            h3: root.querySelectorAll('h3').map((el: any) => el.text.trim())
        },
        imageDetails,
        hreflangs: [],
        napSignals: { googleMapsLinks: 0, phoneLinks: 0 },
        dataLeakage: { emailsFoundCount: 0, sampleEmails: [] },
        internalLinksCount: currentState.processed.length,
        externalLinksCount: 0,
        totalScripts,
        blockingScripts,
        totalStylesheets,
        responseTimeMs: 0,
        ttfbMs: 0,
        preflight: {
            robotsTxt: preflightData.robotsTxt,
            sitemap: { status: 200, url: null, urlsFound: preflightData.sitemapUrls.length }
        },
        psiMetricsStr: '',
        psiMetrics: null,
        lighthouseScores: null,
        safeBrowsingStr: '',
        domainAge: 'Unknown',
        sslCertificate: { status: 'READY' },
        wienerSachtextIndex: 0,
        bodyText: '', 
        techStack: preflightData.html.includes('wp-content') ? ['WordPress'] : preflightData.html.includes('__NEXT_DATA__') ? ['Next.js'] : [],
        cdn,
        serverInfo: preflightData.headers['server'] || 'Hidden',
        legal: {
            trackingScripts: {},
            cmpDetected: {},
            linksInFooter: false,
            privacyInFooter: false,
            cookieBannerFound: false
        },
        social: {
            ogTitle: root.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
            ogDescription: root.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
            ogImage: root.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
            ogType: 'website',
            twitterCard: 'summary'
        },
        existingSchemaCount: 0,
        schemaTypes: [],
        securityHeaders,
        headers: preflightData.headers as Record<string, string>,
        crawlSummary: {
          totalInternalLinks: currentState.processed.length, 
          scannedSubpagesCount: currentState.results.length,
          indexablePagesCount: indexableUrls.length,
          crawledUrls: currentState.processed,
          indexableUrls: indexableUrls,
          scannedSubpages: currentState.results,
          brokenLinks: []
        },
        apiEndpoints: [],
        seo: { score: scores.seo, insights: [], recommendations: [], detailedSeo: {} as any },
        performance: { score: scores.performance, insights: [], recommendations: [], detailedPerformance: {} as any },
        security: { score: scores.security, insights: [], recommendations: [], detailedSecurity: {} as any },
        accessibility: { score: scores.accessibility, insights: [], recommendations: [], detailedAccessibility: {} as any },
        compliance: { score: scores.compliance, insights: [], recommendations: [], detailedCompliance: {} as any },
      };

      await setDocument('reports', report.audit_id!, report as any);
      return report;
    });

    return finalReport;
  }
}

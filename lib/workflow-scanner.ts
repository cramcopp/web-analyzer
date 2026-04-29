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

    // STEP 2: Iteratives Crawling in Batches
    let state = await step.do('initialize state', async () => {
      return {
        queue: preflightData.initialQueue as string[],
        processed: [preflightData.mainUrlNormalized] as string[],
        results: [] as any[]
      };
    });

    while (state.queue.length > 0 && state.results.length < preflightData.subpageLimit) {
      const currentBatch = state.queue.slice(0, 5);
      
      const batchUpdate = await step.do(`scan batch ${state.results.length}`, async () => {
        const p = currentBatch.map((u: string) => scanSubpage(u, preflightData.domain, preflightData.robotsTxt.content));
        const scanResults = await Promise.all(p);
        
        const newLinks: string[] = [];
        scanResults.forEach((r: any) => {
          if (!r.error && r.links) {
            r.links.forEach((l: string) => {
              if (!state.processed.includes(l)) newLinks.push(l);
            });
          }
        });

        return {
          scanned: scanResults.filter((r: any) => !r.error),
          discovered: newLinks
        };
      });

      state.results.push(...batchUpdate.scanned);
      state.processed.push(...currentBatch, ...batchUpdate.discovered);
      
      const nextQueue = state.queue.filter((u: string) => !currentBatch.includes(u));
      state.queue = Array.from(new Set([...nextQueue, ...batchUpdate.discovered]));
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
      
      const indexableUrls = [...(mainIndex.isIndexable ? [preflightData.mainUrlNormalized] : []), ...state.results.filter((r: any) => r.isIndexable).map((r: any) => r.url)];

      const report: Partial<AnalysisResult> = {
        audit_id: Math.random().toString(36).substring(7).toUpperCase(),
        createdAt: new Date().toISOString(),
        urlObj: preflightData.mainUrlNormalized,
        title: root.querySelector('title')?.text.trim() || '',
        metaDescription: root.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        crawlSummary: {
          totalInternalLinks: state.processed.length, 
          scannedSubpagesCount: state.results.length,
          indexablePagesCount: indexableUrls.length,
          crawledUrls: state.processed,
          indexableUrls: indexableUrls,
          scannedSubpages: state.results,
          brokenLinks: []
        },
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

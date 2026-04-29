// @ts-ignore - Cloudflare module only available at runtime
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

// IDE Helper: Define Workflow type if missing locally
type Workflow = any;
import { parse } from 'node-html-parser';
import { 
  ScanOptions, 
  AnalysisResult, 
  SubpageResult 
} from './scanner/types';
import { scanSubpage, calculateHeuristicScores, checkIndexability } from './scanner';
import { setDocument } from './firestore-edge';

async function generateAggregatedAiReport(metrics: any, apiKey: string, modelName: string) {
  const prompt = `
  Du bist ein technischer SEO- und Web-Performance-Auditor. 
  Hier sind die aggregierten Hard-Facts eines Website-Crawls:
  ${JSON.stringify(metrics)}

  Analysiere diese Zahlen. Erstelle präzise Insights (was fällt auf?) und konkrete Recommendations (was muss getan werden?).
  Antworte AUSSCHLIESSLICH im JSON-Format.
  
  Erwartete Struktur:
  {
    "seo": { "insights": ["..."], "recommendations": ["..."] },
    "performance": { "insights": ["..."], "recommendations": ["..."] },
    "security": { "insights": ["..."], "recommendations": ["..."] },
    "accessibility": { "insights": ["..."], "recommendations": ["..."] },
    "compliance": { "insights": ["..."], "recommendations": ["..."] }
  }
  `;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.2
          }
        })
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error('Rate Limit');
        throw new Error('API Error');
      }

      const data = await response.json();
      const jsonString = data.candidates[0].content.parts[0].text;
      return JSON.parse(jsonString);

    } catch (error) {
      if (attempt === 3) {
        return {
          seo: { insights: ["KI-Analyse aktuell überlastet."], recommendations: [] },
          performance: { insights: ["KI-Analyse aktuell überlastet."], recommendations: [] },
          security: { insights: ["KI-Analyse aktuell überlastet."], recommendations: [] },
          accessibility: { insights: ["KI-Analyse aktuell überlastet."], recommendations: [] },
          compliance: { insights: ["KI-Analyse aktuell überlastet."], recommendations: [] }
        };
      }
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}

type Env = {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_ID: string;
  FIREBASE_API_KEY: string;
  INTERNAL_SECRET: string;
  SCAN_WORKFLOW: Workflow;
  GEMINI_API_KEY: string;
};

export class ScanWorkflow extends WorkflowEntrypoint<Env, ScanOptions> {
  // @ts-ignore - env is injected by the Workflow runtime
  declare env: Env;

  async run(event: WorkflowEvent<ScanOptions>, step: WorkflowStep) {
    const { url, plan = 'free', auditId, userId } = event.payload;
    
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      
      // STEP 1: Preflight & Root Scan
      const preflightData = await step.do('preflight', async () => {
        const response = await fetch(urlObj.toString(), {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebAnalyzer/1.0)' }
        });
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        
        const html = await response.text();
        const root = parse(html);
        const domain = urlObj.hostname;
        
        // Extract initial queue
        const links = root.querySelectorAll('a[href]').map(a => a.getAttribute('href'));
        const internalQueue = Array.from(new Set(
          links
            .filter(l => l && (l.startsWith('/') || l.includes(domain)))
            .map(l => l!.startsWith('/') ? `${urlObj.origin}${l}` : l!)
        )).slice(0, 50); // Hard limit for safety

        return {
          domain,
          mainUrlNormalized: urlObj.toString(),
          initialQueue: internalQueue,
          html,
          subpageLimit: plan === 'agency' ? 100 : plan === 'pro' ? 25 : 10,
          robotsTxt: { content: '' },
          headers: Object.fromEntries(response.headers.entries())
        };
      });

      const root = parse(preflightData.html);
      const mainIndex = checkIndexability(
        preflightData.mainUrlNormalized, 
        200, 
        root.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
        preflightData.headers['x-robots-tag'] || '',
        preflightData.headers['content-type'] || 'text/html',
        preflightData.html,
        '',
        root.querySelector('link[rel="canonical"]')?.getAttribute('href') || ''
      );

      // STEP 2: Iteratives Crawling
      let currentState = await step.do('initialize state', async () => {
        return {
          queue: preflightData.initialQueue as string[],
          processed: [preflightData.mainUrlNormalized] as string[],
          results: [] as any[]
        };
      });

      let batchIndex = 0;

      while (currentState.queue.length > 0 && currentState.results.length < preflightData.subpageLimit) {
        const currentBatch = currentState.queue.slice(0, 5);
        
        // JEDER Step bekommt einen einzigartigen Namen
        currentState = await step.do(`batch-process-${batchIndex}`, async () => {
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
          
          // Progress Update to Firestore
          const newResultsCount = currentState.results.length + validResults.length;
          const progress = Math.min(10 + Math.round((newResultsCount / preflightData.subpageLimit) * 80), 90);
          
          await setDocument('reports', auditId!, { 
            progress, 
            status: 'scanning',
            adminSecret: this.env.INTERNAL_SECRET 
          }, null, null, this.env);

          return {
            results: [...currentState.results, ...validResults],
            processed: Array.from(new Set([...newProcessed, ...newDiscovered])),
            queue: Array.from(new Set([...remainingQueue, ...newDiscovered]))
          };
        });

        batchIndex++;
      }

      // STEP 3: Scoring & Final Report
      const finalReport = await step.do('finalize report', async () => {
        const allImages = root.querySelectorAll('img');
        const imagesTotal = allImages.length;
        const imagesWithoutAlt = allImages.filter((img: any) => !img.getAttribute('alt')).length;
        
        const scripts = root.querySelectorAll('script');
        const blockingScripts = scripts.filter((s: any) => !s.getAttribute('async') && !s.getAttribute('defer') && s.getAttribute('src')).length;
        const totalStylesheets = root.querySelectorAll('link[rel="stylesheet"]').length;

        const scores = calculateHeuristicScores(root, mainIndex);
        const indexableUrls = [...(mainIndex.isIndexable ? [preflightData.mainUrlNormalized] : []), ...currentState.results.filter((r: any) => r.isIndexable).map((r: any) => r.url)];

        // 2. Metrics for AI (Aggregate everything into one single prompt)
        const aiMetrics = {
          domain: preflightData.domain,
          title: root.querySelector('title')?.text.trim() || '',
          crawledPages: currentState.processed.length,
          indexablePages: indexableUrls.length,
          imagesTotal,
          imagesWithoutAlt,
          blockingScripts,
          totalStylesheets,
          h1Count: root.querySelectorAll('h1').length,
          hasSitemap: (preflightData as any).sitemapUrls?.length > 0 || false,
          heuristicScores: scores,
          subpageSample: currentState.results.slice(0, 5).map((r: any) => ({
            url: r.url,
            title: r.title,
            status: r.status,
            isIndexable: r.isIndexable
          }))
        };

        // 3. One single, aggregated AI Call
        const modelName = plan === 'agency' || plan === 'pro' 
          ? 'gemini-3-flash-preview' 
          : 'gemini-3.1-flash-lite-preview';
          
        const aiReport = await generateAggregatedAiReport(aiMetrics, this.env.GEMINI_API_KEY, modelName);

        // 4. Data Pruning (Firestore 1MB limit protection)
        const slimSubpages = currentState.results.map((r: any) => {
          const { strippedContent, links, ...safeData } = r; 
          return safeData;
        });

        const report: Partial<AnalysisResult> = {
          audit_id: auditId || Math.random().toString(36).substring(7).toUpperCase(),
          userId: userId,
          createdAt: new Date().toISOString(),
          url: preflightData.mainUrlNormalized,
          urlObj: preflightData.mainUrlNormalized,
          title: aiMetrics.title,
          metaDescription: root.querySelector('meta[name="description"]')?.getAttribute('content') || '',
          status: 'completed',
          progress: 100,
          crawlSummary: {
            totalInternalLinks: currentState.processed.length, 
            scannedSubpagesCount: currentState.results.length,
            indexablePagesCount: indexableUrls.length,
            crawledUrls: currentState.processed,
            indexableUrls: indexableUrls,
            scannedSubpages: slimSubpages as any,
            brokenLinks: []
          },
          // Populate sections from AI results
          seo: { score: scores.seo, insights: aiReport.seo.insights, recommendations: aiReport.seo.recommendations, detailedSeo: {} as any },
          performance: { score: scores.performance, insights: aiReport.performance.insights, recommendations: aiReport.performance.recommendations, detailedPerformance: {} as any },
          security: { score: scores.security, insights: aiReport.security.insights, recommendations: aiReport.security.recommendations, detailedSecurity: {} as any },
          accessibility: { score: scores.accessibility, insights: aiReport.accessibility.insights, recommendations: aiReport.accessibility.recommendations, detailedAccessibility: {} as any },
          compliance: { score: scores.compliance, insights: aiReport.compliance.insights, recommendations: aiReport.compliance.recommendations, detailedCompliance: {} as any },
          adminSecret: this.env.INTERNAL_SECRET
        };

        await setDocument('reports', report.audit_id!, report as any, null, null, this.env);
        return report;
      });

      return finalReport;
    } catch (err: any) {
      console.error("Workflow Error:", err);
      await setDocument('reports', auditId!, { 
        status: 'error', 
        error: err.message,
        adminSecret: this.env.INTERNAL_SECRET 
      }, null, null, this.env);
      throw err;
    }
  }
}

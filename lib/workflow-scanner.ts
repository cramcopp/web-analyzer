// @ts-ignore
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { 
  performPreflight, 
  scanSubpage, 
  calculateHeuristicScores, 
  normalizeUrl,
  isSameBaseDomain,
  checkIndexability,
  stripHtmlForAi
} from './scanner';
import { setDocument } from './firestore-edge';
import { AnalysisResult, ScanOptions, SubpageResult } from './scanner/types';
import { parse } from 'node-html-parser';

// IDE Helper
type Workflow = any;

export interface Env {
  SCAN_WORKFLOW: Workflow;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_ID: string;
  FIREBASE_API_KEY: string;
  GEMINI_API_KEY: string;
  INTERNAL_SECRET: string;
}

// --- KI HILFSFUNKTION ---
async function generateAggregatedAiReport(metrics: any, apiKey: string, plan: string) {
  const isPremium = plan === 'pro' || plan === 'agency';
  
  const systemInstruction = isPremium 
    ? `Du bist ein Senior Technical SEO Consultant. Analysiere diese Daten extrem tiefgründig. Verknüpfe Metriken (z.B. Ladezeit und Skripte). Gib detaillierte Empfehlungen.`
    : `Du bist ein einfacher Website-Checker. Fasse die offensichtlichsten Fehler kurz zusammen. Gib maximal 1-2 sehr simple Ratschläge pro Kategorie.`;

  const prompt = `
  ${systemInstruction}
  Hier sind die aggregierten Hard-Facts eines Website-Crawls:
  ${JSON.stringify(metrics)}

  Antworte AUSSCHLIESSLICH im JSON-Format mit dieser Struktur:
  {
    "seo": { "insights": ["..."], "recommendations": ["..."] },
    "performance": { "insights": ["..."], "recommendations": ["..."] },
    "security": { "insights": ["..."], "recommendations": ["..."] },
    "accessibility": { "insights": ["..."], "recommendations": ["..."] },
    "compliance": { "insights": ["..."], "recommendations": ["..."] }
  }
  `;

  const fetchModel = async (modelName: string) => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
      })
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text);
  };

  try {
    // Nutze stabile Modelle wie angefordert
    if (isPremium) return await fetchModel('gemini-3-flash-preview');
    return await fetchModel('gemini-3.1-flash-lite-preview');
  } catch (error) {
    try {
      return await fetchModel('gemini-3.1-flash-lite-preview'); // Fallback
    } catch (fallbackError) {
      return {
        seo: { insights: ["KI-Analyse aktuell überlastet."], recommendations: [] },
        performance: { insights: ["KI-Analyse aktuell überlastet."], recommendations: [] },
        security: { insights: ["KI-Analyse aktuell überlastet."], recommendations: [] },
        accessibility: { insights: ["KI-Analyse aktuell überlastet."], recommendations: [] },
        compliance: { insights: ["KI-Analyse aktuell überlastet."], recommendations: [] }
      };
    }
  }
}

// --- WORKFLOW ENGINE ---
export class ScanWorkflow extends WorkflowEntrypoint<Env, ScanOptions> {
  // @ts-ignore
  declare env: Env;

  async run(event: WorkflowEvent<ScanOptions>, step: WorkflowStep) {
    const { url, plan = 'free', auditId, userId } = event.payload;
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    
    try {
      // STEP 1: Preflight & Root Scan
      const preflightData = await step.do('preflight and root scan', async () => {
        const preflight = await performPreflight(urlObj, plan);
        return { ...preflight };
      });

      const root = parse(preflightData.html);
      const mainIndex = await step.do('main indexability check', async () => {
          const htmlStripped = stripHtmlForAi(preflightData.html);
          const bodyText = htmlStripped.replace(/\s+/g, ' ').trim().slice(0, 500000);
          return checkIndexability(
              preflightData.mainUrlNormalized, 200, 
              root.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index, follow', 
              preflightData.headers['x-robots-tag'] || '', preflightData.headers['content-type'] || '', 
              bodyText, preflightData.robotsTxt.content, 
              root.querySelector('link[rel="canonical"]')?.getAttribute('href') || null, 
              !!(root.querySelector('link[rel="next"]') || root.querySelector('link[rel="prev"]'))
          );
      });

      // STEP 2: Iteratives Crawling (MIT BATCH-INDEX FIX)
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
          
          // Progress Update
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

      // STEP 3: Scoring & Final Report (MIT FIRESTORE-1MB-FIX & KI)
      const finalReport = await step.do('finalize report', async () => {
        const allImages = root.querySelectorAll('img');
        const imagesTotal = allImages.length;
        const imagesWithoutAlt = allImages.filter((img: any) => !img.getAttribute('alt')).length;
        
        const scripts = root.querySelectorAll('script');
        const blockingScripts = scripts.filter((s: any) => !s.getAttribute('async') && !s.getAttribute('defer') && s.getAttribute('src')).length;
        const totalStylesheets = root.querySelectorAll('link[rel="stylesheet"]').length;

        const scores = calculateHeuristicScores(root, mainIndex);
        const indexableUrls = [...(mainIndex.isIndexable ? [preflightData.mainUrlNormalized] : []), ...currentState.results.filter((r: any) => r.isIndexable).map((r: any) => r.url)];

        // KI-Aufruf
        const aiMetrics = {
          domain: preflightData.domain, 
          crawledPages: currentState.processed.length,
          indexablePages: indexableUrls.length, 
          imagesTotal, 
          imagesWithoutAlt,
          blockingScripts, 
          totalStylesheets, 
          hasSitemap: preflightData.sitemapUrls.length > 0,
          heuristicScores: scores
        };
        
        const aiReport = await generateAggregatedAiReport(aiMetrics, this.env.GEMINI_API_KEY, plan);

        // 1MB Firestore Crash-Schutz!
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
          title: root.querySelector('title')?.text.trim() || '',
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

// NEU: Der HTTP-Empfänger, der den Workflow von außen startet!
export default {
  async fetch(req: Request, env: Env) {
    if (req.method === 'POST') {
      const params = await req.json();
      // Hier startet der Worker seinen eigenen Workflow!
      await env.SCAN_WORKFLOW.create({ params });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response("Method not allowed", { status: 405 });
  }
};

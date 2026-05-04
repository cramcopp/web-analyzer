import type { RuntimeEnv } from '@/lib/cloudflare-env';
import type { AuditIssue } from '@/types/audit';

export type AiReportMode = 'off' | 'budget' | 'full';

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function truncate(value: unknown, max = 500) {
  if (typeof value !== 'string') return value;
  return value.length > max ? `${value.slice(0, max)}...[truncated]` : value;
}

function compactIssues(issues: AuditIssue[]) {
  return issues
    .slice()
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
    .slice(0, 80)
    .map((issue) => ({
      id: issue.id,
      issueType: issue.issueType,
      category: issue.category,
      severity: issue.severity,
      confidence: issue.confidence,
      affectedUrls: issue.affectedUrls.slice(0, 10),
      evidenceRefs: issue.evidenceRefs,
      title: issue.title,
      description: truncate(issue.description, 360),
      fixHint: truncate(issue.fixHint, 360),
      sourceType: issue.sourceType,
      status: issue.status,
    }));
}

function compactFacts(facts: unknown, limit = 25) {
  return asArray(facts).slice(0, limit);
}

export function getAiReportMode(env: RuntimeEnv): AiReportMode {
  const value = (env.AI_REPORT_MODE || 'budget').toLowerCase();
  if (value === 'off' || value === 'full') return value;
  return 'budget';
}

export function shouldRunAiReport(env: RuntimeEnv, groundedData: any) {
  if (getAiReportMode(env) === 'off') return false;
  if (!env.GEMINI_API_KEY) return false;
  return asArray(groundedData.issues).length > 0;
}

export function getAiReportModels(plan: string, mode: AiReportMode, env: RuntimeEnv) {
  const configured = env.AI_REPORT_MODELS?.split(',').map((model) => model.trim()).filter(Boolean);
  if (configured?.length) return configured;

  if (mode === 'full') {
    return plan === 'free'
      ? ['gemini-3.1-flash-lite-preview', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview']
      : ['gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview', 'gemini-2.5-flash'];
  }

  return ['gemini-3.1-flash-lite-preview', 'gemini-2.5-flash-lite'];
}

export function getAiAttemptLimit(mode: AiReportMode) {
  return mode === 'full' ? 2 : 1;
}

export function buildGeminiEndpoint(modelId: string, apiKey: string, env: RuntimeEnv) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (env.CLOUDFLARE_ACCOUNT_ID && env.AI_GATEWAY_TOKEN) {
    const gatewayId = env.AI_GATEWAY_ID || 'default';
    headers['x-goog-api-key'] = apiKey;
    headers['cf-aig-authorization'] = `Bearer ${env.AI_GATEWAY_TOKEN}`;

  return {
      url: `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${gatewayId}/google-ai-studio/v1beta/models/${modelId}:generateContent`,
      headers,
      provider: 'cloudflare-ai-gateway',
    };
  }

  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    headers,
    provider: 'google-ai-studio',
  };
}

export async function requestGeminiContent({
  modelId,
  apiKey,
  env,
  body,
  cacheKey,
}: {
  modelId: string;
  apiKey: string;
  env: RuntimeEnv;
  body: unknown;
  cacheKey?: string;
}) {
  const gatewayId = env.AI_GATEWAY_ID || 'default';

  if (env.AI?.gateway && env.CLOUDFLARE_ACCOUNT_ID) {
    const response = await env.AI.gateway(gatewayId).run(
      {
        provider: 'google-ai-studio',
        endpoint: `v1beta/models/${modelId}:generateContent`,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        query: body,
      },
      {
        gateway: {
          cacheKey: cacheKey ? `report:${modelId}:${cacheKey}` : undefined,
          cacheTtl: 60 * 60 * 24 * 7,
          collectLog: true,
          metadata: {
            app: 'web-analyzer',
            feature: 'agency-report',
            model: modelId,
          },
        },
      },
    );

    return {
      response,
      provider: 'cloudflare-ai-gateway-binding',
    };
  }

  const aiEndpoint = buildGeminiEndpoint(modelId, apiKey, env);
  const response = await fetch(aiEndpoint.url, {
    method: 'POST',
    headers: aiEndpoint.headers,
    body: JSON.stringify(body),
  });

  return {
    response,
    provider: aiEndpoint.provider,
  };
}

export function buildGroundedReportPayload(scrapeData: any, url: string, plan: string) {
  const crawlSummary = scrapeData.crawlSummary || {};
  const scanPlan = scrapeData.scanPlan || scrapeData.plan || plan;
  const evidence = asArray(scrapeData.evidence).slice(0, 80).map((item: any) => ({
    id: item.id,
    type: item.type,
    url: item.url,
    inlineValue: truncate(item.inlineValue, 500),
    checksum: item.checksum,
    createdAt: item.createdAt,
  }));

    return {
    url,
    plan: scanPlan,
    accountPlan: scrapeData.accountPlan || scanPlan,
    scanPlan,
    scannerVersion: scrapeData.scannerVersion,
    crawlLimitUsed: scrapeData.crawlLimitUsed || crawlSummary.crawlLimitUsed,
    crawlDevice: scrapeData.crawlDevice,
    renderMode: scrapeData.renderMode,
    renderAudit: scrapeData.renderAudit,
    psiMetrics: scrapeData.psiMetrics,
    psiResults: scrapeData.psiResults,
    cruxRecord: scrapeData.cruxRecord,
    googleInspection: scrapeData.googleInspection,
    lighthouseScores: scrapeData.lighthouseScores,
    issues: compactIssues(asArray(scrapeData.issues)),
    evidence,
    crawlSummary: {
      startUrl: crawlSummary.startUrl,
      totalUrls: crawlSummary.totalUrls,
      totalInternalLinks: crawlSummary.totalInternalLinks,
      scannedSubpagesCount: crawlSummary.scannedSubpagesCount,
      crawledPagesCount: crawlSummary.crawledPagesCount,
      crawlLimitUsed: crawlSummary.crawlLimitUsed,
      crawlDepthReached: crawlSummary.crawlDepthReached,
      indexablePagesCount: crawlSummary.indexablePagesCount,
      depthDistribution: crawlSummary.depthDistribution,
      statusCodeDistribution: crawlSummary.statusCodeDistribution,
      indexabilityReasons: crawlSummary.indexabilityReasons,
      sitemapCoverage: crawlSummary.sitemapCoverage,
      internalLinking: crawlSummary.internalLinking,
      canonicalClusters: asArray(crawlSummary.canonicalClusters).slice(0, 50),
      duplicateContentClusters: asArray(crawlSummary.duplicateContentClusters).slice(0, 50),
      hreflangSummary: crawlSummary.hreflangSummary,
      structuredDataSummary: crawlSummary.structuredDataSummary,
      externalLinkChecks: crawlSummary.externalLinkChecks,
      redirectChains: asArray(crawlSummary.redirectChains).slice(0, 50),
      pageAudit: asArray(crawlSummary.pageAudit).slice(0, 80),
      crawledUrls: asArray(crawlSummary.crawledUrls).slice(0, 100),
      indexableUrls: asArray(crawlSummary.indexableUrls).slice(0, 100),
      blockedUrls: asArray(crawlSummary.blockedUrls).slice(0, 50),
      skippedUrls: asArray(crawlSummary.skippedUrls).slice(0, 50),
      brokenLinks: asArray(crawlSummary.brokenLinks).slice(0, 80),
      scannedSubpages: asArray(crawlSummary.scannedSubpages).slice(0, 30).map((page: any) => ({
        url: page.url,
        title: truncate(page.title, 120),
        h1Count: page.h1Count,
        imagesWithoutAlt: page.imagesWithoutAlt,
        status: page.status,
        isIndexable: page.isIndexable,
        indexabilityReason: page.indexabilityReason,
        crawlDepth: page.crawlDepth,
        crawlSource: page.crawlSource,
        canonical: page.canonical,
        wordCount: page.wordCount,
        structuredDataTypes: page.structuredDataTypes,
      })),
      sitemapUrls: asArray(crawlSummary.sitemapUrls).slice(0, 100),
      sourceType: crawlSummary.sourceType,
    },
    scoreBreakdown: scrapeData.scoreBreakdown || null,
    realProviderFacts: {
      keywordFacts: compactFacts(scrapeData.keywordFacts),
      rankFacts: compactFacts(scrapeData.rankFacts),
      backlinkFacts: compactFacts(scrapeData.backlinkFacts),
      competitorFacts: compactFacts(scrapeData.competitorFacts),
      trafficFacts: compactFacts(scrapeData.trafficFacts),
      aiVisibilityFacts: compactFacts(scrapeData.aiVisibilityFacts),
    },
    gscData: scrapeData.gscData || null,
    cruxMetrics: scrapeData.cruxMetrics || null,
    dataSources: scrapeData.dataSources || {},
  };
}

export async function createAiReportCacheKey(payload: unknown) {
  const serialized = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(serialized);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function sectionFromScanner(section: any, missingLabel: string) {
  return {
    score: typeof section?.score === 'number' ? section.score : 0,
    insights: asArray(section?.insights).length ? section.insights : [missingLabel],
    recommendations: asArray(section?.recommendations),
  };
}

export function buildDeterministicReport(scrapeData: any, url: string, reason: string) {
  const missing = `Nicht verfuegbar: ${reason}`;
  const providerMissing = 'Provider nicht verbunden';
  const seo = sectionFromScanner(scrapeData.seo, missing);
  const security = sectionFromScanner(scrapeData.security, missing);
  const performance = sectionFromScanner(scrapeData.performance, missing);
  const accessibility = sectionFromScanner(scrapeData.accessibility, missing);
  const compliance = sectionFromScanner(scrapeData.compliance, missing);
  const contentStrategy = sectionFromScanner(scrapeData.contentStrategy, missing);

  return {
    businessIntelligence: {
      businessNiche: missing,
      keywordGapAnalysis: [providerMissing],
      targetAudienceProfile: missing,
      uniqueSellingPropositions: [],
    },
    overallAssessment: `Deterministischer Scanner-Bericht fuer ${url}. ${reason}`,
    industryNews: [providerMissing],
    implementationPlan: {
      phase1: { title: 'Kritische Issues beheben', tasks: asArray(scrapeData.issues).slice(0, 5).map((issue: any) => `${issue.id}: ${issue.fixHint}`) },
      phase2: { title: 'Monitoring stabilisieren', tasks: ['Neue und geloeste Issues aus Scan-History beobachten.'] },
      phase3: { title: 'Provider anbinden', tasks: ['Keywords, Rankings, Backlinks und Traffic erst nach Provider-Anbindung ausweisen.'] },
      developerPrompt: 'Nutze nur Issues, Evidence und echte Provider-Facts aus diesem Report.',
    },
    competitorBenchmarking: [],
    seo: { ...seo, detailedSeo: { keywordAnalysis: providerMissing, metaTagsAssessment: missing, linkStructure: missing, mobileFriendly: missing, localSeoNap: missing, semanticStructure: missing, ctaAnalysis: missing, contentQuality: { readabilityAssessment: missing, duplicateContentIssues: missing }, technicalSeo: { sitemapStatus: missing, robotsTxtStatus: missing, canonicalStatus: missing, hreflangStatus: missing }, prioritizedTasks: [] } },
    security: { ...security, detailedSecurity: { sqlXssAssessment: missing, headerAnalysis: missing, softwareConfig: missing, dataLeakageAssessment: missing, googleSafeBrowsingStatus: providerMissing, prioritizedTasks: [] } },
    performance: { ...performance, detailedPerformance: { coreVitalsAssessment: missing, resourceOptimization: missing, serverAndCache: missing, domComplexity: missing, perfectionistTweaks: missing, lighthouseMetrics: {}, coreWebVitals: {}, cachingAnalysis: { browserCaching: missing, serverCaching: missing, cdnStatus: missing }, chartData: { vitals: [], resources: [] }, prioritizedTasks: [] } },
    accessibility: { ...accessibility, detailedAccessibility: { visualAndContrast: missing, navigationAndSemantics: missing, prioritizedTasks: [] } },
    compliance: { ...compliance, detailedCompliance: { gdprAssessment: missing, cookieBannerStatus: missing, policyLinksStatus: missing, prioritizedTasks: [] } },
    contentStrategy: { ...contentStrategy, detailedContent: { topicClusters: [], headingHierarchy: missing, keywordCannibalization: providerMissing, readabilityAndTone: missing, prioritizedTasks: [] } },
  };
}

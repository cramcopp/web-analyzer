import type { AuditIssue, AuditScoreBreakdown, EvidenceArtifact, LinkOccurrence, UrlSnapshot } from '@/types/audit';
import type { AiVisibilityCheckSet } from '@/types/ai-visibility';
import type { DataSourceMap } from '@/types/data-source';
import type { AiVisibilityFact, BacklinkFact, CompetitorFact, KeywordFact, ProviderAvailability, ProviderStatus, RankFact, TrafficFact } from '@/types/provider-facts';

export interface ScanOptions {
  url: string;
  plan?: string;
  device?: 'desktop' | 'mobile';
  renderMode?: 'fetch' | 'browser' | 'auto';
  userId?: string;
  projectId?: string;
  auditId?: string;
  env?: Record<string, any>;
}

export interface PsiMetrics {
  fcp: number | null;
  lcp: number | null;
  tbt: number | null;
  cls: number | null;
  speedIndex: number | null;
  tti: number | null;
}

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface SslCertificateData {
  status?: string;
  grade?: string;
  issuerSubject?: string;
  validUntil?: string;
  hstsPolicy?: string;
}

export interface RedirectHop {
  url: string;
  status: number;
  location?: string;
}

export interface ExternalLinkCheck {
  url: string;
  sourceUrl: string;
  status: number | string;
  ok: boolean;
  redirectChain?: RedirectHop[];
  error?: string;
}

export interface RenderAuditData {
  mode: 'fetch' | 'browser' | 'auto';
  used: boolean;
  available: boolean;
  pagesRendered: number;
  pagesRequested: number;
  failedUrls: { url: string; reason: string }[];
  domDiffs?: RenderDomDiff[];
  screenshots?: {
    requested: number;
    captured: number;
    failed: { url: string; reason: string }[];
  };
  source: 'cloudflare_browser_rendering' | 'html_fetch';
}

export interface RenderDomDiff {
  url: string;
  rawHash: string;
  renderedHash: string;
  rawTextLength: number;
  renderedTextLength: number;
  rawLinkCount: number;
  renderedLinkCount: number;
  rawScriptCount: number;
  renderedScriptCount: number;
  significant: boolean;
}

export interface PsiStrategyResult {
  strategy: 'mobile' | 'desktop';
  finalUrl?: string;
  performanceScore?: number | null;
  accessibilityScore?: number | null;
  bestPracticesScore?: number | null;
  seoScore?: number | null;
  metrics: PsiMetrics;
  fieldOverallCategory?: string;
  originFallback?: boolean;
  fetchTime?: string;
  lighthouseVersion?: string;
  error?: string;
}

export interface CruxRecordResult {
  source: 'url' | 'origin';
  id?: string;
  formFactor?: string;
  collectionPeriod?: { firstDate?: string; lastDate?: string };
  metrics: Record<string, { percentile?: number | string; good?: number; needsImprovement?: number; poor?: number }>;
  error?: string;
}

export interface GoogleInspectionPageResult {
  url: string;
  verdict?: string;
  coverageState?: string;
  indexingState?: string;
  robotsTxtState?: string;
  pageFetchState?: string;
  googleCanonical?: string;
  userCanonical?: string;
  lastCrawlTime?: string;
  sitemap?: string[];
  referringUrls?: string[];
  inspectionResultLink?: string;
  error?: string;
}

export interface GoogleInspectionResult {
  source: 'gsc' | 'unavailable';
  property?: string;
  inspectedCount: number;
  skippedCount: number;
  results: GoogleInspectionPageResult[];
  error?: string;
}

export interface SubpageResult {
  error: boolean;
  url: string;
  urlObj?: string;
  crawlDepth?: number;
  discoveredFrom?: string;
  crawlSource?: 'sitemap' | 'link' | 'redirect' | 'seed';
  title?: string;
  metaDescription?: string;
  robots?: string;
  canonical?: string;
  h1Count?: number;
  imagesWithoutAlt?: number;
  status: number | string;
  contentType?: string;
  strippedContent?: string;
  links?: string[];
  externalLinks?: string[];
  internalLinkDetails?: LinkOccurrence[];
  externalLinkDetails?: LinkOccurrence[];
  xRobotsTag?: string;
  redirectLocation?: string;
  redirectChain?: RedirectHop[];
  hasNextPrev?: boolean;
  isIndexable?: boolean;
  indexabilityReason?: string;
  headers?: Record<string, string>;
  htmlLang?: string;
  viewport?: string;
  generator?: string;
  hreflangs?: { hreflang: string; href: string; normalizedHref?: string; valid: boolean }[];
  structuredDataTypes?: string[];
  structuredDataParseErrors?: number;
  jsonLdBlocks?: number;
  wordCount?: number;
  contentFingerprint?: string;
  headings?: { h1: string[]; h2: string[]; h3: string[] };
  images?: { src: string; alt: string }[];
  textBasis?: string;
}

export interface PrioritizedTask {
  priority: 'CRITICAL' | 'IMPORTANT' | 'PERFECTION';
  task: string;
  remediation?: string;
}

export interface AISection {
  score: number;
  insights: string[];
  recommendations: string[];
  prioritizedTasks?: PrioritizedTask[];
}

export interface BusinessIntelligence {
  businessNiche: string;
  keywordGapAnalysis: string[];
  targetAudienceProfile: string;
  uniqueSellingPropositions: string[];
}

export interface ImplementationPlan {
  phase1: { title: string; tasks: string[] };
  phase2: { title: string; tasks: string[] };
  phase3: { title: string; tasks: string[] };
  developerPrompt: string;
}

export interface CompetitorBenchmarking {
  name: string;
  url: string;
  estimatedScores: {
    seo: number;
    security: number;
    performance: number;
  };
}

export interface PreflightData {
  robotsTxt: {
    status: number;
    content: string;
    allowed: boolean;
    crawlDelay?: number;
    sitemaps: string[];
  };
  sitemap: {
    status: number;
    url: string | null;
    urlsFound: number;
  };
}

export interface AnalysisResult {
  // Technical Scrape Data
  audit_id: string;
  userId: string;
  createdAt: string;
  scannerVersion?: string;
  plan?: string;
  accountPlan?: string;
  scanPlan?: string;
  crawlLimitUsed?: number;
  crawlDevice?: 'desktop' | 'mobile';
  renderMode?: 'fetch' | 'browser' | 'auto';
  renderAudit?: RenderAuditData;
  url: string;
  urlObj: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  htmlLang: string;
  generator: string;
  viewport: string;
  viewportScalable: string;
  robots: string;
  status?: 'scanning' | 'completed' | 'error' | 'processing';
  progress?: number;
  h1Count: number;
  h2Count: number;
  imagesTotal: number;
  imagesWithoutAlt: number;
  lazyImages: number;
  maxDomDepth: number;
  semanticTags: { main: number; article: number; section: number; nav: number; header: number; footer: number; aside: number };
  headings: { h1: string[]; h2: string[]; h3: string[] };
  imageDetails: { src: string; alt: string | null }[];
  hreflangs: { hreflang: string; href: string }[];
  napSignals: { googleMapsLinks: number; phoneLinks: number };
  dataLeakage: { emailsFoundCount: number; sampleEmails: string[] };
  internalLinksCount: number;
  externalLinksCount: number;
  totalScripts: number;
  blockingScripts: number;
  totalStylesheets: number;
  responseTimeMs: number;
  ttfbMs?: number;
  responseTimeSource?: string;
  preflight?: PreflightData;
  psiMetricsStr: string;
  psiMetrics: PsiMetrics | null;
  psiResults?: PsiStrategyResult[];
  cruxRecord?: CruxRecordResult | null;
  googleInspection?: GoogleInspectionResult | null;
  lighthouseScores: LighthouseScores | null;
  safeBrowsingStr: string;
  domainAge: string;
  sslCertificate: SslCertificateData;
  wienerSachtextIndex: number;
  bodyText: string;
  techStack: string[];
  cdn: string;
  serverInfo: string;
  legal: {
    trackingScripts: Record<string, boolean>;
    cmpDetected: Record<string, boolean>;
    linksInFooter: boolean;
    privacyInFooter: boolean;
    cookieBannerFound: boolean;
  };
  social: {
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    ogType: string;
    twitterCard: string;
  };
  existingSchemaCount: number;
  schemaTypes: string[];
  securityHeaders: Record<string, string>;
  headers: Record<string, string>;
  crawlSummary: { 
    startUrl?: string;
    sourceType?: string;
    crawlLimitUsed?: number;
    crawlDepthReached?: number;
    totalInternalLinks: number; 
    scannedSubpagesCount: number; 
    crawledPagesCount?: number;
    internalLinksCount?: number;
    indexablePagesCount: number;
    sitemapUrls?: string[];
    skippedUrls?: { url: string; reason: string }[];
    blockedUrls?: string[];
    crawledUrls: string[];
    indexableUrls: string[];
    depthDistribution?: Record<string, number>;
    statusCodeDistribution?: Record<string, number>;
    indexabilityReasons?: Record<string, number>;
    nonIndexableUrls?: { url: string; reason: string }[];
    sitemapCoverage?: {
      submitted: number;
      crawled: number;
      indexable: number;
      notCrawled: string[];
    };
    pageAudit?: {
      url: string;
      status: number | string;
      crawlDepth?: number;
      crawlSource?: string;
      isIndexable?: boolean;
      indexabilityReason?: string;
      titleLength: number;
      metaDescriptionLength: number;
      wordCount: number;
      internalInlinks: number;
      internalOutlinks: number;
      externalOutlinks: number;
      canonical?: string;
      canonicalSelfReferenced: boolean;
      hreflangCount: number;
      schemaTypes: string[];
    }[];
    internalLinking?: {
      orphanUrls: string[];
      lowInlinkUrls: { url: string; inlinks: number }[];
      deepUrls: { url: string; depth: number }[];
      nofollowInternalLinks: { sourceUrl: string; targetUrl: string; anchorText: string }[];
      httpInternalLinks: { sourceUrl: string; targetUrl: string; anchorText: string }[];
      linkGraphMetrics?: {
        averageDepth: number;
        maxDepth: number;
        orphanCount: number;
        lowInlinkCount: number;
        topLinkedPages: { url: string; inlinks: number; depth: number }[];
        crawlPriorityPages: { url: string; inlinks: number; depth: number; reason: string }[];
      };
    };
    canonicalClusters?: { canonical: string; urls: string[] }[];
    canonicalIssues?: { sourceUrl: string; canonical: string; targetReason: string }[];
    duplicateContentClusters?: { fingerprint: string; urls: string[]; wordCount: number }[];
    hreflangSummary?: {
      totalTags: number;
      pagesWithHreflang: number;
      invalidTags: { url: string; hreflang: string; href: string }[];
      missingSelfReferences: string[];
      missingReturnTags: { sourceUrl: string; targetUrl: string; hreflang: string }[];
    };
    structuredDataSummary?: {
      pagesWithStructuredData: string[];
      schemaTypes: string[];
      jsonLdBlocks: number;
      parseErrors: number;
    };
    externalLinkChecks?: {
      checkedCount: number;
      brokenCount: number;
      skippedCount: number;
      brokenLinks: ExternalLinkCheck[];
    };
    redirectChains?: { url: string; chain: RedirectHop[] }[];
    scannedSubpages: Omit<SubpageResult, 'error'>[]; 
    brokenLinks: { url: string; status: number | string }[] 
  };
  scanDiff?: import('@/types/monitoring').ScanDiff | null;
  apiEndpoints: string[];
  issues?: AuditIssue[];
  evidence?: EvidenceArtifact[];
  urlSnapshots?: UrlSnapshot[];
  scoreBreakdown?: AuditScoreBreakdown;
  dataSources?: DataSourceMap;
  providerAvailability?: ProviderAvailability;
  providerStatuses?: ProviderStatus[];
  keywordFacts?: KeywordFact[];
  rankFacts?: RankFact[];
  backlinkFacts?: BacklinkFact[];
  competitorFacts?: CompetitorFact[];
  trafficFacts?: TrafficFact[];
  aiVisibilityFacts?: AiVisibilityFact[];

  // AI Generated Sections
  businessIntelligence?: BusinessIntelligence;
  overallAssessment?: string;
  industryNews?: string[];
  implementationPlan?: ImplementationPlan;
  competitorBenchmarking?: CompetitorBenchmarking[];
  
  seo?: AISection & {
    detailedSeo: {
      keywordAnalysis: string;
      metaTagsAssessment: string;
      linkStructure: string;
      mobileFriendly: string;
      localSeoNap: string;
      semanticStructure: string;
      ctaAnalysis: string;
      contentQuality: { readabilityAssessment: string; duplicateContentIssues: string };
      technicalSeo: { sitemapStatus: string; robotsTxtStatus: string; canonicalStatus: string; hreflangStatus: string };
      prioritizedTasks: PrioritizedTask[];
    }
  };
  
  security?: AISection & {
    detailedSecurity: {
      sqlXssAssessment: string;
      headerAnalysis: string;
      softwareConfig: string;
      dataLeakageAssessment: string;
      googleSafeBrowsingStatus: string;
      prioritizedTasks: PrioritizedTask[];
    }
  };
  
  performance?: AISection & {
    detailedPerformance: {
      coreVitalsAssessment: string;
      resourceOptimization: string;
      serverAndCache: string;
      domComplexity: string;
      perfectionistTweaks?: string;
      lighthouseMetrics: LighthouseScores;
      coreWebVitals: any;
      cachingAnalysis: any;
      chartData: any;
      prioritizedTasks: PrioritizedTask[];
    }
  };
  
  accessibility?: AISection & {
    detailedAccessibility: {
      visualAndContrast: string;
      navigationAndSemantics: string;
      prioritizedTasks: PrioritizedTask[];
    }
  };
  
  compliance?: AISection & {
    detailedCompliance: {
      gdprAssessment: string;
      cookieBannerStatus: string;
      policyLinksStatus: string;
      prioritizedTasks: PrioritizedTask[];
    }
  };
  
  contentStrategy?: AISection & {
    detailedContent: {
      topicClusters: string[];
      headingHierarchy: string;
      keywordCannibalization: string;
      readabilityAndTone: string;
      prioritizedTasks: PrioritizedTask[];
    }
  };
  aiVisibility?: AISection & {
    sourceType?: 'heuristic' | 'provider' | 'unavailable';
    checks?: AiVisibilityCheckSet;
  };
}

export interface ScanOptions {
  url: string;
  plan?: string;
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

export interface SubpageResult {
  error: boolean;
  url: string;
  title?: string;
  metaDescription?: string;
  robots?: string;
  canonical?: string;
  h1Count?: number;
  imagesWithoutAlt?: number;
  status: number | string;
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

export interface AnalysisResult {
  // Technical Scrape Data
  audit_id: string;
  createdAt: string;
  urlObj: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  htmlLang: string;
  generator: string;
  viewport: string;
  viewportScalable: string;
  robots: string;
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
  psiMetricsStr: string;
  psiMetrics: PsiMetrics | null;
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
    totalInternalLinks: number; 
    scannedSubpagesCount: number; 
    scannedSubpages: Omit<SubpageResult, 'error'>[]; 
    brokenLinks: { url: string; status: number | string }[] 
  };
  apiEndpoints: string[];

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
}

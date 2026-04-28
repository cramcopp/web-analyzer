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
  h1Count?: number;
  imagesWithoutAlt?: number;
  status: number | string;
}

export interface AnalysisResult {
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
  semanticTags: { main: number; article: number; section: number; nav: number };
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
}

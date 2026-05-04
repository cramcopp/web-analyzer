export type PrioritizedTask = {
  priority: string;
  task: string;
  remediation?: string;
};

export type DetailedSEO = {
  keywordAnalysis: string;
  metaTagsAssessment: string;
  linkStructure: string;
  mobileFriendly: string;
  localSeoNap: string;
  semanticStructure: string;
  ctaAnalysis: string;
  contentQuality: {
    readabilityAssessment: string;
    duplicateContentIssues: string;
  };
  technicalSeo?: {
    sitemapStatus: string;
    robotsTxtStatus: string;
    canonicalStatus: string;
    hreflangStatus?: string;
  };
  prioritizedTasks: PrioritizedTask[];
};

export type DetailedSecurity = {
  sqlXssAssessment: string;
  headerAnalysis: string;
  softwareConfig: string;
  dataLeakageAssessment?: string;
  googleSafeBrowsingStatus?: string;
  prioritizedTasks: PrioritizedTask[];
};

export type ChartDataFormat = {
  vitals: { metric: string, value: number }[];
  resources: { name: string, count: number }[];
};

export type DetailedPerformance = {
  coreVitalsAssessment: string;
  resourceOptimization: string;
  serverAndCache: string;
  domComplexity: string;
  perfectionistTweaks?: string;
  lighthouseMetrics?: {
    performance: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
  };
  coreWebVitals?: {
    fcp: { value: string, numericValue: number, status: 'good' | 'needs_improvement' | 'poor', recommendation: string };
    lcp: { value: string, numericValue: number, status: 'good' | 'needs_improvement' | 'poor', recommendation: string };
    cls: { value: string, numericValue: number, status: 'good' | 'needs_improvement' | 'poor', recommendation: string };
  };
  cachingAnalysis?: {
    browserCaching: string;
    serverCaching: string;
    cdnStatus: string;
  };
  chartData?: ChartDataFormat;
  prioritizedTasks: PrioritizedTask[];
};

export type DetailedAccessibility = {
  visualAndContrast: string;
  navigationAndSemantics: string;
  prioritizedTasks: PrioritizedTask[];
};

export type DetailedCompliance = {
  gdprAssessment: string;
  cookieBannerStatus: string;
  policyLinksStatus: string;
  prioritizedTasks: PrioritizedTask[];
};

export type DetailedContentStrategy = {
  topicClusters: string[];
  headingHierarchy: string;
  keywordCannibalization: string;
  readabilityAndTone: string;
  prioritizedTasks: PrioritizedTask[];
};

export type DetailedUxAndDesign = {
  mobileExperience: string;
  conversionFunnels: string;
  visualHierarchy: string;
  prioritizedTasks: PrioritizedTask[];
};

export type ReportSection = {
  score: number;
  insights: string[];
  recommendations: string[];
};

export type SeoReportSection = ReportSection & {
  detailedSeo: DetailedSEO;
};

export type SecurityReportSection = ReportSection & {
  detailedSecurity?: DetailedSecurity;
};

export type PerformanceReportSection = ReportSection & {
  detailedPerformance?: DetailedPerformance;
};

export type AccessibilityReportSection = ReportSection & {
  detailedAccessibility?: DetailedAccessibility;
};

export type ComplianceReportSection = ReportSection & {
  detailedCompliance?: DetailedCompliance;
};

export type ContentStrategyReportSection = ReportSection & {
  detailedContent: DetailedContentStrategy;
};

export type UxAndDesignReportSection = ReportSection & {
  detailedUx: DetailedUxAndDesign;
};

export type ReportData = {
  plan?: string;
  accountPlan?: string;
  scanPlan?: string;
  crawlLimitUsed?: number;
  scannerVersion?: string;
  crawlDevice?: 'desktop' | 'mobile';
  renderMode?: 'fetch' | 'browser' | 'auto';
  renderAudit?: any;
  psiMetrics?: any;
  psiResults?: any[];
  cruxRecord?: any;
  googleInspection?: any;
  lighthouseScores?: any;
  scanDiff?: any;
  businessIntelligence?: {
    businessNiche: string;
    keywordGapAnalysis: string[];
    targetAudienceProfile: string;
    uniqueSellingPropositions: string[];
    toneAndReadabilityAlignment?: string;
  };
  competitorBenchmarking?: {
    name: string;
    url: string;
    estimatedScores: {
      seo: number;
      security: number;
      performance: number;
    };
  }[];
  implementationPlan?: {
    phase1: { title: string, tasks: string[] };
    phase2: { title: string, tasks: string[] };
    phase3: { title: string, tasks: string[] };
    developerPrompt: string;
  };
  overallAssessment?: string;
  industryNews?: string[];
  seo?: SeoReportSection;
  security?: SecurityReportSection;
  performance?: PerformanceReportSection;
  accessibility?: AccessibilityReportSection;
  compliance?: ComplianceReportSection;
  contentStrategy?: ContentStrategyReportSection;
  uxAndDesign?: UxAndDesignReportSection;
};

export interface GscData {
  property: string;
  performance: any[];
  performanceTotals: {
    clicks: number;
    impressions: number;
  };
  inspection: any;
  sitemaps: any[];
}

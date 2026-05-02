import type { AuditIssue, EvidenceArtifact } from '@/types/audit';

type GroundingData = {
  url?: string;
  issues: AuditIssue[];
  evidence: EvidenceArtifact[];
  crawlSummary: any;
  scoreBreakdown: any;
  realProviderFacts: {
    keywordFacts: any[];
    rankFacts: any[];
    backlinkFacts: any[];
    competitorFacts: any[];
    trafficFacts: any[];
    aiVisibilityFacts: any[];
  };
  gscData: any;
  psiMetrics: any;
  cruxMetrics: any;
  dataSources: any;
};

export type VerificationAction =
  | 'scores_restored'
  | 'ungrounded_recommendation_removed'
  | 'provider_section_cleared'
  | 'performance_metrics_cleared'
  | 'missing_data_label_applied';

export interface VerificationNotice {
  action: VerificationAction;
  path: string;
  reason: string;
}

const MISSING = 'Nicht verfuegbar';
const PROVIDER_MISSING = 'Provider nicht verbunden';

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function issueVocabulary(issues: AuditIssue[]) {
  const values = new Set<string>();
  issues.forEach((issue) => {
    values.add(issue.id.toLowerCase());
    values.add(issue.issueType.toLowerCase());
    values.add(issue.category.toLowerCase());
    issue.affectedUrls.forEach((url) => values.add(url.toLowerCase()));
    issue.evidenceRefs.forEach((ref) => values.add(ref.toLowerCase()));
  });
  return values;
}

function hasGroundingReference(value: string, grounding: GroundingData) {
  const normalized = value.toLowerCase();
  if (normalized.includes('nicht verfuegbar') || normalized.includes('provider nicht verbunden')) return true;
  if (grounding.issues.length === 0 && grounding.evidence.length === 0 && !grounding.crawlSummary) return false;

  const vocab = issueVocabulary(grounding.issues);
  for (const token of vocab) {
    if (token && normalized.includes(token)) return true;
  }

  if (grounding.evidence.some((item) => normalized.includes(item.id.toLowerCase()) || normalized.includes(item.type.toLowerCase()))) return true;
  if (grounding.crawlSummary && /crawl|seite|url|link|sitemap|robots|canonical|h1|title|meta|header/i.test(value)) return true;
  if (grounding.gscData && /gsc|search console|klick|impression/i.test(value)) return true;
  if ((grounding.psiMetrics || grounding.cruxMetrics) && /psi|crux|core web vitals|lcp|cls|fcp|inp|lighthouse/i.test(value)) return true;

  return false;
}

function filterRecommendations(section: any, path: string, grounding: GroundingData, notices: VerificationNotice[]) {
  if (!section) return;
  const recommendations = asArray<string>(section.recommendations);
  section.recommendations = recommendations.filter((recommendation) => {
    const isGrounded = hasGroundingReference(recommendation, grounding);
    if (!isGrounded) {
      notices.push({
        action: 'ungrounded_recommendation_removed',
        path: `${path}.recommendations`,
        reason: recommendation.slice(0, 160),
      });
    }
    return isGrounded;
  });
}

function normalizeTaskList(tasks: unknown, path: string, grounding: GroundingData, notices: VerificationNotice[]) {
  return asArray<any>(tasks).filter((task) => {
    const text = [task?.task, task?.remediation].filter(Boolean).join(' ');
    const isGrounded = hasGroundingReference(text, grounding);
    if (!isGrounded) {
      notices.push({
        action: 'ungrounded_recommendation_removed',
        path,
        reason: text.slice(0, 160),
      });
    }
    return isGrounded;
  });
}

function scrubProviderClaims(report: any, grounding: GroundingData, notices: VerificationNotice[]) {
  const facts = grounding.realProviderFacts;

  if (facts.competitorFacts.length === 0 && asArray(report.competitorBenchmarking).length > 0) {
    report.competitorBenchmarking = [];
    notices.push({
      action: 'provider_section_cleared',
      path: 'competitorBenchmarking',
      reason: 'Keine echten competitorFacts vorhanden.',
    });
  }

  if (facts.keywordFacts.length === 0) {
    report.businessIntelligence = report.businessIntelligence || {};
    report.businessIntelligence.keywordGapAnalysis = asArray<string>(report.businessIntelligence.keywordGapAnalysis)
      .map((item) => `${item} (${PROVIDER_MISSING}: keine Suchvolumen-/Ranking-Fakten)`);
    if (report.seo?.detailedSeo) {
      report.seo.detailedSeo.keywordAnalysis = PROVIDER_MISSING;
    }
    notices.push({
      action: 'missing_data_label_applied',
      path: ['businessIntelligence', 'keywordGapAnalysis'].join('.'),
      reason: 'Keine keywordFacts vorhanden.',
    });
  }

  if (facts.rankFacts.length === 0) {
    report.rankFacts = [];
  }
  if (facts.backlinkFacts.length === 0) {
    report.backlinkFacts = [];
  }
  if (facts.trafficFacts.length === 0) {
    report.trafficFacts = [];
  }
  if (facts.aiVisibilityFacts.length === 0) {
    report.aiVisibilityFacts = [];
  }
}

function scrubPerformanceClaims(report: any, grounding: GroundingData, notices: VerificationNotice[]) {
  if (grounding.psiMetrics || grounding.cruxMetrics) return;

  if (!report.performance?.detailedPerformance) return;
  const detailed = report.performance.detailedPerformance;
  detailed.coreVitalsAssessment = MISSING;
  detailed.lighthouseMetrics = {};
  detailed.coreWebVitals = {};
  detailed.chartData = {
    vitals: [],
    resources: detailed.chartData?.resources || [],
  };
  notices.push({
    action: 'performance_metrics_cleared',
    path: 'performance.detailedPerformance',
    reason: 'PSI/CrUX fehlen; konkrete Performance-Feldwerte duerfen nicht behauptet werden.',
  });
}

function restoreScannerScores(report: any, scrapeData: any, notices: VerificationNotice[]) {
  const scannerScores = {
    seo: scrapeData.seo?.score,
    performance: scrapeData.performance?.score,
    security: scrapeData.security?.score,
    accessibility: scrapeData.accessibility?.score,
    compliance: scrapeData.compliance?.score,
    contentStrategy: scrapeData.contentStrategy?.score,
    aiVisibility: scrapeData.aiVisibility?.score || scrapeData.scoreBreakdown?.aiVisibility?.score,
  };

  (Object.keys(scannerScores) as Array<keyof typeof scannerScores>).forEach((key) => {
    const scannerScore = scannerScores[key];
    if (typeof scannerScore !== 'number') return;
    if (key === 'aiVisibility') {
      report.aiVisibility = {
        ...(scrapeData.aiVisibility || report.aiVisibility || {}),
        score: scannerScore,
        sourceType: scrapeData.aiVisibility?.sourceType || 'heuristic',
      };
      return;
    }
    report[key] = report[key] || {};
    if (report[key].score !== scannerScore) {
      notices.push({
        action: 'scores_restored',
        path: `${key}.score`,
        reason: `AI score ${report[key].score} replaced with scanner score ${scannerScore}.`,
      });
    }
    report[key].score = scannerScore;
  });
}

function attachGrounding(report: any, scrapeData: any) {
  report.issues = scrapeData.issues || [];
  report.evidence = scrapeData.evidence || [];
  report.urlSnapshots = scrapeData.urlSnapshots || [];
  report.crawlSummary = scrapeData.crawlSummary || null;
  report.audit_id = scrapeData.audit_id || null;
  report.url = scrapeData.url || report.url || null;
  report.scoreBreakdown = scrapeData.scoreBreakdown || null;
  report.dataSources = scrapeData.dataSources || {};
  report.keywordFacts = scrapeData.keywordFacts || [];
  report.rankFacts = scrapeData.rankFacts || [];
  report.backlinkFacts = scrapeData.backlinkFacts || [];
  report.competitorFacts = scrapeData.competitorFacts || [];
  report.trafficFacts = scrapeData.trafficFacts || [];
  report.aiVisibilityFacts = scrapeData.aiVisibilityFacts || [];
}

export function buildGroundingData(scrapeData: any, url?: string): GroundingData {
  return {
    url,
    issues: scrapeData.issues || [],
    evidence: scrapeData.evidence || [],
    crawlSummary: scrapeData.crawlSummary || null,
    scoreBreakdown: scrapeData.scoreBreakdown || null,
    realProviderFacts: {
      keywordFacts: scrapeData.keywordFacts || [],
      rankFacts: scrapeData.rankFacts || [],
      backlinkFacts: scrapeData.backlinkFacts || [],
      competitorFacts: scrapeData.competitorFacts || [],
      trafficFacts: scrapeData.trafficFacts || [],
      aiVisibilityFacts: scrapeData.aiVisibilityFacts || [],
    },
    gscData: scrapeData.gscData || null,
    psiMetrics: scrapeData.psiMetrics || null,
    cruxMetrics: scrapeData.cruxMetrics || null,
    dataSources: scrapeData.dataSources || {},
  };
}

export function verifyReportGrounding(report: any, scrapeData: any, url?: string) {
  const verified = { ...report };
  const notices: VerificationNotice[] = [];
  const grounding = buildGroundingData(scrapeData, url);

  restoreScannerScores(verified, scrapeData, notices);
  scrubProviderClaims(verified, grounding, notices);
  scrubPerformanceClaims(verified, grounding, notices);

  filterRecommendations(verified.seo, 'seo', grounding, notices);
  filterRecommendations(verified.security, 'security', grounding, notices);
  filterRecommendations(verified.performance, 'performance', grounding, notices);
  filterRecommendations(verified.accessibility, 'accessibility', grounding, notices);
  filterRecommendations(verified.compliance, 'compliance', grounding, notices);
  filterRecommendations(verified.contentStrategy, 'contentStrategy', grounding, notices);

  if (verified.seo?.detailedSeo) {
    verified.seo.detailedSeo.prioritizedTasks = normalizeTaskList(verified.seo.detailedSeo.prioritizedTasks, 'seo.detailedSeo.prioritizedTasks', grounding, notices);
  }
  if (verified.security?.detailedSecurity) {
    verified.security.detailedSecurity.prioritizedTasks = normalizeTaskList(verified.security.detailedSecurity.prioritizedTasks, 'security.detailedSecurity.prioritizedTasks', grounding, notices);
  }
  if (verified.performance?.detailedPerformance) {
    verified.performance.detailedPerformance.prioritizedTasks = normalizeTaskList(verified.performance.detailedPerformance.prioritizedTasks, 'performance.detailedPerformance.prioritizedTasks', grounding, notices);
  }
  if (verified.accessibility?.detailedAccessibility) {
    verified.accessibility.detailedAccessibility.prioritizedTasks = normalizeTaskList(verified.accessibility.detailedAccessibility.prioritizedTasks, 'accessibility.detailedAccessibility.prioritizedTasks', grounding, notices);
  }
  if (verified.compliance?.detailedCompliance) {
    verified.compliance.detailedCompliance.prioritizedTasks = normalizeTaskList(verified.compliance.detailedCompliance.prioritizedTasks, 'compliance.detailedCompliance.prioritizedTasks', grounding, notices);
  }
  if (verified.contentStrategy?.detailedContent) {
    verified.contentStrategy.detailedContent.prioritizedTasks = normalizeTaskList(verified.contentStrategy.detailedContent.prioritizedTasks, 'contentStrategy.detailedContent.prioritizedTasks', grounding, notices);
  }

  attachGrounding(verified, scrapeData);
  verified.verification = {
    grounded: notices.length === 0,
    notices,
    verifiedAt: new Date().toISOString(),
  };

  return verified;
}

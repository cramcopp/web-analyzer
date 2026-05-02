import type { AuditIssue, EvidenceArtifact } from '@/types/audit';
import type { ReportBuilderConfig, ReportSectionKey } from '@/types/reporting';

const DEFAULT_PUBLIC_SECTIONS: ReportSectionKey[] = ['summary', 'scores', 'issues', 'evidence', 'crawl', 'recommendations'];

function summarizeEvidence(evidence: EvidenceArtifact[] = []) {
  return evidence.map((item) => ({
    id: item.id,
    type: item.type,
    url: item.url,
    createdAt: item.createdAt,
    hasInlineValue: Boolean(item.inlineValue),
    storageUri: item.storageUri,
    checksum: item.checksum,
  }));
}

function summarizeIssues(issues: AuditIssue[] = []) {
  return issues.map((issue) => ({
    id: issue.id,
    issueType: issue.issueType,
    category: issue.category,
    severity: issue.severity,
    confidence: issue.confidence,
    affectedUrls: issue.affectedUrls,
    evidenceRefs: issue.evidenceRefs,
    ruleVersion: issue.ruleVersion,
    title: issue.title,
    description: issue.description,
    fixHint: issue.fixHint,
    businessImpact: issue.businessImpact,
    sourceType: issue.sourceType,
    status: issue.status || 'open',
  }));
}

export function sanitizeReportForClient(rawReport: any, builder?: ReportBuilderConfig | null) {
  const results = typeof rawReport?.results === 'string'
    ? JSON.parse(rawReport.results)
    : rawReport?.results || rawReport;

  const rawScrapeData = typeof rawReport?.rawScrapeData === 'string'
    ? JSON.parse(rawReport.rawScrapeData)
    : rawReport?.rawScrapeData || {};

  const source = {
    ...results,
    issues: results?.issues || rawScrapeData?.issues || [],
    evidence: results?.evidence || rawScrapeData?.evidence || [],
    crawlSummary: results?.crawlSummary || rawScrapeData?.crawlSummary || null,
    scoreBreakdown: results?.scoreBreakdown || rawScrapeData?.scoreBreakdown || null,
    dataSources: results?.dataSources || rawScrapeData?.dataSources || {},
  };

  const sections = new Set(builder?.sections?.length ? builder.sections : DEFAULT_PUBLIC_SECTIONS);
  const sanitized = {
    id: rawReport?.id || rawReport?.audit_id,
    url: rawReport?.url || source.url,
    createdAt: rawReport?.createdAt || source.createdAt,
    score: rawReport?.score,
    builder: builder ? {
      title: builder.title,
      sections: builder.sections,
      includeEvidence: builder.includeEvidence,
      includeTasks: builder.includeTasks,
      includeDebugData: false,
    } : null,
    dataSources: source.dataSources,
  };

  if (sections.has('scores')) {
    Object.assign(sanitized, {
      seo: source.seo,
      performance: source.performance,
      security: source.security,
      accessibility: source.accessibility,
      compliance: source.compliance,
      contentStrategy: source.contentStrategy,
      scoreBreakdown: source.scoreBreakdown,
    });
  }

  if (sections.has('summary')) {
    Object.assign(sanitized, { overallAssessment: source.overallAssessment });
  }

  if (sections.has('recommendations')) {
    Object.assign(sanitized, { implementationPlan: source.implementationPlan });
  }

  if (sections.has('crawl')) {
    Object.assign(sanitized, { crawlSummary: source.crawlSummary });
  }

  if (sections.has('issues') || sections.has('tasks')) {
    Object.assign(sanitized, { issues: summarizeIssues(source.issues) });
  }

  if (sections.has('evidence') && builder?.includeEvidence !== false) {
    Object.assign(sanitized, { evidence: summarizeEvidence(source.evidence) });
  } else {
    Object.assign(sanitized, { evidence: [] });
  }

  return sanitized;
}

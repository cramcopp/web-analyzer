import type { AnalysisResult } from './scanner/types';

function truncateText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return value;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...[truncated]` : value;
}

function pruneForFirestore(result: AnalysisResult) {
  const pruned: any = {
    ...result,
    bodyText: undefined,
    evidence: result.evidence?.map((item: any) => ({
      id: item.id,
      type: item.type,
      url: item.url,
      storageUri: item.storageUri,
      checksum: item.checksum,
      contentType: item.contentType,
      createdAt: item.createdAt,
    })),
    crawlSummary: result.crawlSummary ? {
      ...result.crawlSummary,
      scannedSubpages: result.crawlSummary.scannedSubpages?.map((page: any) => ({
        ...page,
        strippedContent: truncateText(page.strippedContent, 3000),
        textBasis: truncateText(page.textBasis, 1500),
      })),
    } : result.crawlSummary,
  };

  delete pruned.env;
  delete pruned.adminSecret;
  return pruned;
}

function stringifyWithinLimit(value: unknown, maxLength = 950000) {
  let serialized = JSON.stringify(value);
  if (serialized.length <= maxLength) return serialized;

  const compact = { ...(value as any) };
  delete compact.bodyText;
  if (compact.crawlSummary?.scannedSubpages) {
    compact.crawlSummary.scannedSubpages = compact.crawlSummary.scannedSubpages.map((page: any) => ({
      url: page.url,
      title: page.title,
      metaDescription: page.metaDescription,
      status: page.status,
      h1Count: page.h1Count,
      links: page.links,
      headings: page.headings,
      textBasis: truncateText(page.textBasis, 700),
    }));
  }

  serialized = JSON.stringify(compact);
  return serialized.length > maxLength ? serialized.slice(0, maxLength) : serialized;
}

export function toStoredReportDocument(result: AnalysisResult, reportId: string, userId?: string, projectId?: string) {
  const pruned = pruneForFirestore(result);
  const report: Record<string, any> = {
    audit_id: reportId,
    userId: userId || result.userId,
    url: result.url,
    urlObj: result.urlObj || result.url,
    createdAt: result.createdAt || new Date().toISOString(),
    status: 'completed',
    progress: 100,
    rawScrapeData: stringifyWithinLimit(pruned),
    crawlSummary: result.crawlSummary,
    seo: result.seo,
    performance: result.performance,
    security: result.security,
    accessibility: result.accessibility,
    compliance: result.compliance,
  };

  const scoreValues = [result.seo, result.performance, result.security, result.accessibility, result.compliance]
    .map((section: any) => section?.score)
    .filter((score: unknown): score is number => typeof score === 'number');
  if (scoreValues.length > 0) {
    report.score = Math.round(scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length);
  }
  if (projectId) report.projectId = projectId;

  return report;
}

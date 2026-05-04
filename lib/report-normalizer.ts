import { normalizePlan } from './plans';

type ScoreSection = { score?: number };

const SCORE_KEYS = [
  'seo',
  'performance',
  'security',
  'accessibility',
  'compliance',
  'contentStrategy',
] as const;

export type NormalizedStoredReport = Record<string, any> & {
  id?: string;
  audit_id?: string;
  url?: string;
  createdAt?: string;
  status?: string;
  progress?: number;
  results: any | null;
  rawScrapeData: any | null;
  score: number;
  seoScore: number;
  performanceScore: number;
  securityScore: number;
  accessibilityScore: number;
  complianceScore: number;
};

function parseMaybeJson<T = any>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function hasAuditPayload(value: any) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (
      value.crawlSummary ||
      value.issues ||
      value.evidence ||
      value.scoreBreakdown ||
      value.seo ||
      value.performance ||
      value.security
    )
  );
}

function numeric(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizePlanValue(value: unknown) {
  return normalizePlan(typeof value === 'string' ? value : null);
}

function sectionScore(source: any, key: typeof SCORE_KEYS[number]) {
  return numeric(source?.[`${key}Score`]) ?? numeric((source?.[key] as ScoreSection | undefined)?.score) ?? 0;
}

function averageScore(source: any) {
  const values = SCORE_KEYS
    .map((key) => numeric((source?.[key] as ScoreSection | undefined)?.score))
    .filter((value): value is number => value !== null);

  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function normalizeStoredReport(report: any): NormalizedStoredReport {
  const parsedResults = parseMaybeJson(report?.results);
  const parsedRaw = parseMaybeJson(report?.rawScrapeData);
  const inlineAudit = hasAuditPayload(report) ? report : null;
  const rawScrapeData = parsedRaw || inlineAudit;
  const results = parsedResults || inlineAudit || rawScrapeData;
  const merged = {
    ...(rawScrapeData || {}),
    ...(results || {}),
    ...report,
  };
  const auditId = merged.audit_id || merged.auditId || report?.id || results?.audit_id || rawScrapeData?.audit_id;
  const url = merged.url || merged.urlObj || report?.url || results?.url || rawScrapeData?.url;
  const score = numeric(report?.score) ?? numeric(merged.score) ?? averageScore(merged);
  const scanPlan = normalizePlanValue(merged.scanPlan || merged.plan || rawScrapeData?.scanPlan || rawScrapeData?.plan || report?.plan);
  const accountPlan = normalizePlanValue(merged.accountPlan || rawScrapeData?.accountPlan || scanPlan);

  return {
    ...report,
    ...merged,
    id: report?.id || auditId,
    audit_id: auditId,
    url,
    plan: scanPlan,
    accountPlan,
    scanPlan,
    results: results ? { ...results, id: report?.id || results.id, audit_id: auditId, url, plan: scanPlan, accountPlan, scanPlan } : null,
    rawScrapeData: rawScrapeData ? { ...rawScrapeData, id: report?.id || rawScrapeData.id, audit_id: auditId, url, plan: scanPlan, accountPlan, scanPlan } : null,
    score,
    seoScore: numeric(report?.seoScore) ?? sectionScore(merged, 'seo'),
    performanceScore: numeric(report?.performanceScore) ?? sectionScore(merged, 'performance'),
    securityScore: numeric(report?.securityScore) ?? sectionScore(merged, 'security'),
    accessibilityScore: numeric(report?.accessibilityScore) ?? sectionScore(merged, 'accessibility'),
    complianceScore: numeric(report?.complianceScore) ?? sectionScore(merged, 'compliance'),
  };
}

export function normalizeStoredReports(reports: any[]) {
  return reports.map(normalizeStoredReport);
}

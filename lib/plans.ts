export const PLAN_ORDER = ['free', 'pro', 'agency', 'business'] as const;

export type PlanType = typeof PLAN_ORDER[number];
export type ExportFormat = 'csv' | 'json' | 'pdf';
export type ApiAccess = false | 'basic' | 'full';
export type MonitoringAccess = false | 'weekly' | 'daily' | 'hourly_custom';
export const ADDON_ORDER = [
  'keywords_100',
  'project_100_keywords',
  'team_seat',
  'white_label_domain',
  'backlinks',
  'ai_visibility',
] as const;

export type AddonKey = typeof ADDON_ORDER[number];
export type AddonQuantities = Partial<Record<AddonKey, number>>;

type PlanConfig = {
  name: string;
  label: string;
  monthlyPrice: number;
  yearlyMonthlyPrice: number;
  scanLimitMonthly: number;
  crawlLimit: number;
  monthlyCrawlPages: number;
  visibleDetailPages: number;
  issueUrlsVisible: number;
  evidencePerReport: number;
  projects: number;
  rankKeywords: number;
  competitors: number;
  seats: number;
  exports: readonly ExportFormat[];
  monitoring: MonitoringAccess;
  whiteLabel: boolean;
  api: ApiAccess;
};

type AddonConfig = {
  name: string;
  label: string;
  monthlyPrice: number;
  description: string;
  quantityLabel: string;
  effects: {
    rankKeywords?: number;
    projects?: number;
    seats?: number;
    whiteLabelCustomDomain?: boolean;
    backlinks?: boolean;
    aiVisibility?: boolean;
  };
};

export const PLAN_CONFIG = {
  free: {
    name: 'Free',
    label: 'Free',
    monthlyPrice: 0,
    yearlyMonthlyPrice: 0,
    scanLimitMonthly: 10,
    crawlLimit: 100,
    monthlyCrawlPages: 1_000,
    visibleDetailPages: 3,
    issueUrlsVisible: 10,
    evidencePerReport: 0,
    projects: 1,
    rankKeywords: 0,
    competitors: 0,
    seats: 1,
    exports: [],
    monitoring: false,
    whiteLabel: false,
    api: false,
  },
  pro: {
    name: 'Pro',
    label: 'Pro',
    monthlyPrice: 59,
    yearlyMonthlyPrice: 49,
    scanLimitMonthly: 100,
    crawlLimit: 2_500,
    monthlyCrawlPages: 100_000,
    visibleDetailPages: 100,
    issueUrlsVisible: 500,
    evidencePerReport: 10,
    projects: 10,
    rankKeywords: 500,
    competitors: 10,
    seats: 1,
    exports: ['csv', 'json'],
    monitoring: 'weekly',
    whiteLabel: false,
    api: false,
  },
  agency: {
    name: 'Agency',
    label: 'Agency',
    monthlyPrice: 199,
    yearlyMonthlyPrice: 159,
    scanLimitMonthly: 1_000,
    crawlLimit: 25_000,
    monthlyCrawlPages: 1_000_000,
    visibleDetailPages: 2_500,
    issueUrlsVisible: 10_000,
    evidencePerReport: 100,
    projects: 100,
    rankKeywords: 5_000,
    competitors: 100,
    seats: 10,
    exports: ['csv', 'json', 'pdf'],
    monitoring: 'daily',
    whiteLabel: true,
    api: 'basic',
  },
  business: {
    name: 'Business',
    label: 'Business',
    monthlyPrice: 349,
    yearlyMonthlyPrice: 279,
    scanLimitMonthly: 5_000,
    crawlLimit: 100_000,
    monthlyCrawlPages: 5_000_000,
    visibleDetailPages: 25_000,
    issueUrlsVisible: 100_000,
    evidencePerReport: 500,
    projects: 500,
    rankKeywords: 25_000,
    competitors: 500,
    seats: 50,
    exports: ['csv', 'json', 'pdf'],
    monitoring: 'hourly_custom',
    whiteLabel: true,
    api: 'full',
  },
} as const satisfies Record<PlanType, PlanConfig>;

export const ADDON_CONFIG = {
  keywords_100: {
    name: '100 zusätzliche Keywords',
    label: '+100 Keywords',
    monthlyPrice: 9,
    description: 'Erhöht dein monatliches Rank-Keyword-Kontingent um 100 Keywords.',
    quantityLabel: '100 Keywords',
    effects: { rankKeywords: 100 },
  },
  project_100_keywords: {
    name: 'Zusätzliches Projekt inkl. 100 Keywords',
    label: '+1 Projekt',
    monthlyPrice: 12,
    description: 'Fügt ein weiteres Projekt hinzu und erhöht das Keyword-Kontingent um 100.',
    quantityLabel: 'Projektpaket',
    effects: { projects: 1, rankKeywords: 100 },
  },
  team_seat: {
    name: 'Extra Team Seat',
    label: '+1 Seat',
    monthlyPrice: 19,
    description: 'Erhöht dein Team-Limit um einen zusätzlichen Nutzer/Seat.',
    quantityLabel: 'Seat',
    effects: { seats: 1 },
  },
  white_label_domain: {
    name: 'White Label Custom Domain',
    label: 'Custom Domain',
    monthlyPrice: 29,
    description: 'Schaltet eine eigene White-Label-Report-Domain für Kundenzugriffe frei.',
    quantityLabel: 'Domain',
    effects: { whiteLabelCustomDomain: true },
  },
  backlinks: {
    name: 'Backlink Add-on',
    label: 'Backlinks',
    monthlyPrice: 99,
    description: 'Schaltet Backlink-Daten und Backlink-Facts frei, sobald ein Provider angebunden ist.',
    quantityLabel: 'Backlink-Modul',
    effects: { backlinks: true },
  },
  ai_visibility: {
    name: 'AI Visibility Add-on',
    label: 'AI Visibility',
    monthlyPrice: 49,
    description: 'Schaltet AI-Visibility-Auswertungen und Provider-Facts frei.',
    quantityLabel: 'AI-Modul',
    effects: { aiVisibility: true },
  },
} as const satisfies Record<AddonKey, AddonConfig>;

export type PlanVisibilityLimits = {
  visibleDetailPages: number;
  issueUrlsVisible: number;
  evidencePerReport: number;
};

export type VisibilitySummary = PlanVisibilityLimits & {
  scanPlan: PlanType;
  crawledPages: number;
  detailPagesTotal: number;
  hiddenDetailPages: number;
  issueUrlsTotal: number;
  hiddenIssueUrls: number;
  evidenceTotal: number;
  hiddenEvidence: number;
};

export type EffectivePlanConfig = PlanConfig & {
  addOns: AddonQuantities;
  monthlyAddonPrice: number;
  whiteLabelCustomDomain: boolean;
  backlinkAddon: boolean;
  aiVisibilityAddon: boolean;
};

export function normalizePlan(plan?: unknown): PlanType {
  const value = String(plan || '').toLowerCase();
  return PLAN_ORDER.includes(value as PlanType) ? value as PlanType : 'free';
}

export function getPlanRank(plan?: unknown) {
  return PLAN_ORDER.indexOf(normalizePlan(plan));
}

export function hasPlanRank(plan: unknown, minimumPlan: PlanType) {
  return getPlanRank(plan) >= getPlanRank(minimumPlan);
}

export function getPlanConfig(plan?: unknown) {
  return PLAN_CONFIG[normalizePlan(plan)];
}

export function normalizeAddonKey(value?: unknown): AddonKey | null {
  const key = String(value || '').toLowerCase();
  return ADDON_ORDER.includes(key as AddonKey) ? key as AddonKey : null;
}

export function normalizeAddonQuantities(addOns?: unknown): AddonQuantities {
  const source = asRecord(addOns) || {};
  return ADDON_ORDER.reduce<AddonQuantities>((acc, key) => {
    const value = Number(source[key]);
    if (Number.isFinite(value) && value > 0) {
      acc[key] = Math.floor(value);
    }
    return acc;
  }, {});
}

export function getAddonConfig(addonKey?: unknown) {
  const key = normalizeAddonKey(addonKey);
  return key ? ADDON_CONFIG[key] : null;
}

export function getEffectivePlanConfig(plan?: unknown, addOns?: unknown): EffectivePlanConfig {
  const config = getPlanConfig(plan);
  const quantities = normalizeAddonQuantities(addOns);

  return ADDON_ORDER.reduce<EffectivePlanConfig>((effective, addonKey) => {
    const quantity = quantities[addonKey] || 0;
    if (quantity <= 0) return effective;

    const addon = ADDON_CONFIG[addonKey];
    const effects = addon.effects as AddonConfig['effects'];
    return {
      ...effective,
      rankKeywords: effective.rankKeywords + (effects.rankKeywords || 0) * quantity,
      projects: effective.projects + (effects.projects || 0) * quantity,
      seats: effective.seats + (effects.seats || 0) * quantity,
      monthlyAddonPrice: effective.monthlyAddonPrice + addon.monthlyPrice * quantity,
      whiteLabelCustomDomain: effective.whiteLabelCustomDomain || Boolean(effects.whiteLabelCustomDomain),
      backlinkAddon: effective.backlinkAddon || Boolean(effects.backlinks),
      aiVisibilityAddon: effective.aiVisibilityAddon || Boolean(effects.aiVisibility),
    };
  }, {
    ...config,
    addOns: quantities,
    monthlyAddonPrice: 0,
    whiteLabelCustomDomain: false,
    backlinkAddon: false,
    aiVisibilityAddon: false,
  });
}

export function getMonthlyScanLimit(plan?: unknown) {
  return getPlanConfig(plan).scanLimitMonthly;
}

export function getCrawlLimit(plan?: unknown) {
  return getPlanConfig(plan).crawlLimit;
}

export function getMonthlyCrawlPageLimit(plan?: unknown) {
  return getPlanConfig(plan).monthlyCrawlPages;
}

export function getVisibilityLimits(plan?: unknown): PlanVisibilityLimits {
  const config = getPlanConfig(plan);
  return {
    visibleDetailPages: config.visibleDetailPages,
    issueUrlsVisible: config.issueUrlsVisible,
    evidencePerReport: config.evidencePerReport,
  };
}

export function getEffectiveCrawlLimit(plan?: unknown, remainingMonthlyPages?: number | null) {
  const crawlLimit = getCrawlLimit(plan);
  if (typeof remainingMonthlyPages !== 'number' || !Number.isFinite(remainingMonthlyPages)) return crawlLimit;
  return Math.max(0, Math.min(crawlLimit, Math.floor(remainingMonthlyPages)));
}

export function formatExports(exports: readonly string[]) {
  return exports.length > 0 ? exports.map((item) => item.toUpperCase()).join(', ') : 'Keine';
}

export function formatMonitoring(value: MonitoringAccess) {
  if (value === 'weekly') return 'Wöchentlich';
  if (value === 'daily') return 'Täglich';
  if (value === 'hourly_custom') return 'Stündlich/custom';
  return 'Nein';
}

export function formatApiAccess(value: ApiAccess) {
  if (value === 'basic') return 'Basic API';
  if (value === 'full') return 'Full API';
  return 'Nein';
}

export function formatAddOns(addOns?: unknown) {
  const quantities = normalizeAddonQuantities(addOns);
  const labels = ADDON_ORDER
    .filter((key) => (quantities[key] || 0) > 0)
    .map((key) => {
      const quantity = quantities[key] || 0;
      return `${quantity}x ${ADDON_CONFIG[key].label}`;
    });
  return labels.length ? labels.join(', ') : 'Keine';
}

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null;
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function countCrawledPages(source: Record<string, any>) {
  const crawlSummary = asRecord(source.crawlSummary) || {};
  const crawledUrls = asArray(crawlSummary.crawledUrls);
  const scannedSubpages = asArray(crawlSummary.scannedSubpages);
  const crawledPagesCount = Number(crawlSummary.crawledPagesCount);
  const scannedSubpagesCount = Number(crawlSummary.scannedSubpagesCount);

  if (Number.isFinite(crawledPagesCount) && crawledPagesCount > 0) return crawledPagesCount;
  if (crawledUrls.length > 0) return crawledUrls.length;
  if (Number.isFinite(scannedSubpagesCount) && scannedSubpagesCount >= 0) return scannedSubpagesCount + 1;
  return scannedSubpages.length > 0 ? scannedSubpages.length + 1 : 1;
}

function countDetailPages(source: Record<string, any>) {
  const crawlSummary = asRecord(source.crawlSummary) || {};
  const scannedSubpages = asArray(crawlSummary.scannedSubpages);
  const pageAudit = asArray(crawlSummary.pageAudit);
  const scannedSubpagesCount = Number(crawlSummary.scannedSubpagesCount);

  if (Number.isFinite(scannedSubpagesCount) && scannedSubpagesCount >= 0) return scannedSubpagesCount;
  return Math.max(scannedSubpages.length, pageAudit.length);
}

function limitIssueUrls(issues: any[], issueUrlLimit: number) {
  let remaining = issueUrlLimit;
  let issueUrlsTotal = 0;
  let issueUrlsVisible = 0;

  const limitedIssues = issues.map((issue) => {
    const affectedUrls = asArray<string>(issue?.affectedUrls);
    issueUrlsTotal += affectedUrls.length;
    const visibleUrls = affectedUrls.slice(0, Math.max(remaining, 0));
    remaining -= visibleUrls.length;
    issueUrlsVisible += visibleUrls.length;

    return {
      ...issue,
      affectedUrls: visibleUrls,
      affectedUrlsHidden: Math.max(affectedUrls.length - visibleUrls.length, 0),
    };
  });

  return {
    issues: limitedIssues,
    issueUrlsTotal,
    hiddenIssueUrls: Math.max(issueUrlsTotal - issueUrlsVisible, 0),
  };
}

export function buildVisibilitySummaryFromReport(report: unknown, plan?: string | null): VisibilitySummary {
  const source = asRecord(report) || {};
  const raw = asRecord(source.rawScrapeData);
  const results = asRecord(source.results);
  const merged = { ...(raw || {}), ...(results || {}), ...source };
  const scanPlan = normalizePlan(plan || merged.scanPlan || merged.plan || merged.accountPlan);
  const limits = getVisibilityLimits(scanPlan);
  const detailPagesTotal = countDetailPages(merged);
  const issueUrlsTotal = asArray(merged.issues).reduce((total, issue) => total + asArray(issue?.affectedUrls).length, 0);
  const evidenceTotal = asArray(merged.evidence).length;

  return {
    scanPlan,
    ...limits,
    crawledPages: countCrawledPages(merged),
    detailPagesTotal,
    hiddenDetailPages: Math.max(detailPagesTotal - limits.visibleDetailPages, 0),
    issueUrlsTotal,
    hiddenIssueUrls: Math.max(issueUrlsTotal - limits.issueUrlsVisible, 0),
    evidenceTotal,
    hiddenEvidence: Math.max(evidenceTotal - limits.evidencePerReport, 0),
  };
}

function applyLimitsToShape(source: Record<string, any>, visibility: VisibilitySummary) {
  const limited = { ...source };

  if (asRecord(limited.crawlSummary)) {
    const crawlSummary = { ...limited.crawlSummary };
    if (Array.isArray(crawlSummary.scannedSubpages)) {
      crawlSummary.scannedSubpages = crawlSummary.scannedSubpages.slice(0, visibility.visibleDetailPages);
    }
    if (Array.isArray(crawlSummary.pageAudit)) {
      crawlSummary.pageAudit = crawlSummary.pageAudit.slice(0, visibility.visibleDetailPages);
    }
    crawlSummary.visibilityLimits = visibility;
    limited.crawlSummary = crawlSummary;
  }

  if (Array.isArray(limited.issues)) {
    const limitedIssues = limitIssueUrls(limited.issues, visibility.issueUrlsVisible);
    limited.issues = limitedIssues.issues;
    visibility.issueUrlsTotal = limitedIssues.issueUrlsTotal;
    visibility.hiddenIssueUrls = limitedIssues.hiddenIssueUrls;
  }

  if (Array.isArray(limited.evidence)) {
    limited.evidence = limited.evidence.slice(0, visibility.evidencePerReport);
  }

  if (Array.isArray(limited.urlSnapshots)) {
    limited.urlSnapshots = limited.urlSnapshots.slice(0, visibility.visibleDetailPages);
  }

  limited.visibilityLimits = visibility;
  return limited;
}

export function applyReportVisibilityLimits<T>(report: T, plan?: string | null): T {
  const source = asRecord(report);
  if (!source) return report;

  const visibility = buildVisibilitySummaryFromReport(source, plan);
  const limited = applyLimitsToShape(source, visibility);

  if (asRecord(source.rawScrapeData)) {
    limited.rawScrapeData = applyLimitsToShape(source.rawScrapeData, { ...visibility });
  }

  if (asRecord(source.results)) {
    limited.results = applyLimitsToShape(source.results, { ...visibility });
  }

  return limited as T;
}

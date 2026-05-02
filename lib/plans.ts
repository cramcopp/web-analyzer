export const PLAN_CONFIG = {
  free: {
    name: 'WAP Basic',
    scanLimitMonthly: 5,
    crawlLimit: 5,
    projects: 1,
    rankKeywords: 0,
    competitors: 0,
    exports: [],
    monitoring: false,
    whiteLabel: false,
    api: false,
  },
  pro: {
    name: 'WAP Premium',
    scanLimitMonthly: 50,
    crawlLimit: 50,
    projects: 10,
    rankKeywords: 100,
    competitors: 3,
    exports: ['csv', 'json'],
    monitoring: true,
    whiteLabel: false,
    api: false,
  },
  agency: {
    name: 'WAP Agency',
    scanLimitMonthly: 500,
    crawlLimit: 500,
    projects: 100,
    rankKeywords: 1500,
    competitors: 25,
    exports: ['csv', 'json', 'pdf'],
    monitoring: true,
    whiteLabel: true,
    api: true,
  },
} as const;

export type PlanType = keyof typeof PLAN_CONFIG;
export type ExportFormat = (typeof PLAN_CONFIG)[PlanType]['exports'][number];

export function normalizePlan(plan?: string | null): PlanType {
  if (plan === 'pro' || plan === 'agency') return plan;
  return 'free';
}

export function getPlanConfig(plan?: string | null) {
  return PLAN_CONFIG[normalizePlan(plan)];
}

export function getMonthlyScanLimit(plan?: string | null) {
  return getPlanConfig(plan).scanLimitMonthly;
}

export function getCrawlLimit(plan?: string | null) {
  return getPlanConfig(plan).crawlLimit;
}

export function formatExports(exports: readonly string[]) {
  return exports.length > 0 ? exports.map((item) => item.toUpperCase()).join(', ') : 'Keine';
}

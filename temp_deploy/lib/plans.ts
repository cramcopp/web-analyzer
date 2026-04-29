export const PLAN_CONFIG = {
  free: { maxScans: 5 },
  pro: { maxScans: 50 },
  agency: { maxScans: 500 }
} as const;

export type PlanType = keyof typeof PLAN_CONFIG;

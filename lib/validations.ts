import { z } from 'zod';

export const analyzeSchema = z.object({
  url: z.string().min(1, "URL ist erforderlich"),
  apiKey: z.string().optional(),
});

export const projectCreateSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100),
  url: z.string().url("Ungültige URL").optional().or(z.literal("")),
  teamId: z.string().optional().nullable(),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100).optional(),
  url: z.string().url("Ungültige URL").optional().or(z.literal("")),
});

export const teamCreateSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100),
});

export const teamInviteSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
});

export const teamMemberSchema = z.object({
  uid: z.string().min(1),
});

export const reportSaveSchema = z.object({
  url: z.string().url(),
  score: z.number().min(0).max(100),
  results: z.string(), // JSON string of results
  rawScrapeData: z.string().optional(), // JSON string of raw scrape data
  seoScore: z.number().optional(),
  performanceScore: z.number().optional(),
  securityScore: z.number().optional(),
  accessibilityScore: z.number().optional(),
  complianceScore: z.number().optional(),
  categories: z.record(z.string(), z.any()).optional(),
  metrics: z.record(z.string(), z.any()).optional(),
});

export const checkoutSchema = z.object({
  checkoutType: z.enum(['plan', 'addon']).default('plan'),
  planName: z.enum(['pro', 'agency', 'business']).optional(),
  addonKey: z.enum(['keywords_100', 'project_100_keywords', 'team_seat', 'white_label_domain', 'backlinks', 'ai_visibility']).optional(),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
  quantity: z.number().int().min(1).max(50).default(1),
  priceId: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.checkoutType === 'plan' && !value.planName) {
    ctx.addIssue({ code: 'custom', path: ['planName'], message: 'Plan fehlt' });
  }

  if (value.checkoutType === 'addon' && !value.addonKey) {
    ctx.addIssue({ code: 'custom', path: ['addonKey'], message: 'Add-on fehlt' });
  }
});

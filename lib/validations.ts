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
  categories: z.record(z.string(), z.any()).optional(),
  metrics: z.record(z.string(), z.any()).optional(),
});

export const checkoutSchema = z.object({
  planName: z.enum(['pro', 'agency']),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
  priceId: z.string().optional(),
});

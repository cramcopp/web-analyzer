import type { DataSourceType } from './data-source';

export type AuditCategory =
  | 'seo'
  | 'performance'
  | 'security'
  | 'accessibility'
  | 'compliance'
  | 'content'
  | 'ai_visibility';

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AuditIssueStatus = 'new' | 'open' | 'fixed' | 'ignored' | 'reopened';

export type ScoreKey =
  | 'seo'
  | 'performance'
  | 'security'
  | 'accessibility'
  | 'compliance'
  | 'contentStrategy'
  | 'aiVisibility';

export type EvidenceArtifactType =
  | 'html'
  | 'rendered_dom'
  | 'headers'
  | 'screenshot'
  | 'redirect_chain'
  | 'robots_txt'
  | 'sitemap'
  | 'gsc'
  | 'psi'
  | 'crux';

export interface AuditIssue {
  id: string;
  scanId: string;
  issueType: string;
  category: AuditCategory;
  severity: AuditSeverity;
  confidence: number;
  affectedUrls: string[];
  evidenceRefs: string[];
  ruleVersion: string;
  title: string;
  description: string;
  fixHint: string;
  businessImpact?: string;
  sourceType: DataSourceType;
  status?: AuditIssueStatus;
  createdAt?: string;
}

export interface ScoreDeduction {
  issueId: string;
  issueType: string;
  title: string;
  severity: AuditSeverity;
  confidence: number;
  points: number;
  affectedUrlCount?: number;
  groupedIssueCount?: number;
  rawPoints?: number;
  capped?: boolean;
}

export interface CategoryScoreBreakdown {
  score: number;
  deductions: ScoreDeduction[];
}

export type AuditScoreBreakdown = Record<ScoreKey, CategoryScoreBreakdown>;

export interface EvidenceArtifact {
  id: string;
  type: EvidenceArtifactType;
  url: string;
  storageUri?: string;
  contentType?: string;
  inlineValue?: string;
  checksum?: string;
  createdAt: string;
}

export interface UrlSnapshot {
  id: string;
  scanId: string;
  url: string;
  statusCode: number | string;
  contentType?: string;
  title?: string;
  metaDescription?: string;
  canonical?: string;
  robotsMeta?: string;
  xRobotsTag?: string;
  headers: Record<string, string>;
  internalLinks: string[];
  externalLinks: string[];
  internalLinkDetails?: LinkOccurrence[];
  externalLinkDetails?: LinkOccurrence[];
  images: { src: string; alt: string | null }[];
  headings: { h1: string[]; h2: string[]; h3: string[] };
  textBasis?: string;
  capturedAt: string;
}

export interface LinkOccurrence {
  href: string;
  normalizedHref: string;
  text: string;
  title?: string;
  ariaLabel?: string;
  rel?: string;
  target?: string;
}

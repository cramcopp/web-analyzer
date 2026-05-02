import type { AuditIssueStatus } from './audit';

export type ReportVisibility = 'private' | 'public' | 'password';
export type ReportBrandingScope = 'team' | 'project';
export type ReportSectionKey =
  | 'summary'
  | 'scores'
  | 'issues'
  | 'evidence'
  | 'crawl'
  | 'recommendations'
  | 'tasks';

export interface TeamBranding {
  teamId: string;
  projectId?: string;
  scope?: ReportBrandingScope;
  displayName?: string;
  primaryColor?: string;
  logoUrl?: string;
  footerNote?: string;
  updatedAt: string;
}

export interface ReportBuilderConfig {
  id?: string;
  projectId?: string;
  title?: string;
  sections: ReportSectionKey[];
  includeEvidence: boolean;
  includeTasks: boolean;
  includeDebugData: false;
  updatedAt: string;
}

export interface ReportShare {
  token: string;
  reportId: string;
  projectId?: string;
  userId: string;
  visibility: ReportVisibility;
  passwordHash?: string;
  createdAt: string;
  expiresAt?: string;
  branding?: TeamBranding;
  builder?: ReportBuilderConfig;
}

export interface IssueTask {
  id: string;
  projectId: string;
  issueId: string;
  title: string;
  status: AuditIssueStatus;
  assigneeId?: string;
  assigneeName?: string;
  severity?: string;
  affectedUrls?: string[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IssueComment {
  id: string;
  projectId: string;
  issueId: string;
  authorId: string;
  authorName?: string;
  body: string;
  createdAt: string;
}

export interface ScheduledReport {
  id: string;
  projectId: string;
  recipients: string[];
  frequency: 'weekly' | 'monthly';
  enabled: boolean;
  visibility: ReportVisibility;
  builder?: ReportBuilderConfig;
  lastSentAt?: string;
  mailProviderConnected?: boolean;
  createdAt: string;
  updatedAt: string;
}

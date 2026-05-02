import type { AuditIssueStatus, AuditSeverity } from './audit';

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export type AlertType =
  | 'website_down'
  | 'new_500_error'
  | 'new_noindex'
  | 'robots_blocked_important_url'
  | 'canonical_changed'
  | 'sitemap_missing'
  | 'security_header_missing'
  | 'score_drop'
  | 'gsc_clicks_drop'
  | 'gsc_impressions_drop'
  | 'core_web_vitals_regressed';

export interface ScheduledScan {
  id: string;
  projectId: string;
  url: string;
  frequency: ScheduleFrequency;
  enabled: boolean;
  nextRunAt?: string;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRule {
  id: string;
  projectId: string;
  type: AlertType;
  enabled: boolean;
  threshold?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEvent {
  id: string;
  projectId: string;
  type: AlertType;
  severity: AuditSeverity;
  title: string;
  description: string;
  issueId?: string;
  url?: string;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

export interface UptimeCheck {
  id: string;
  projectId: string;
  url: string;
  status: 'up' | 'down' | 'unknown';
  statusCode?: number;
  responseTimeMs?: number;
  checkedAt?: string;
  createdAt: string;
}

export interface IssueHistoryEntry {
  issueId: string;
  issueType: string;
  status: AuditIssueStatus;
  severity: AuditSeverity;
  title: string;
  affectedUrls: string[];
}

export interface ScanDiff {
  id: string;
  projectId: string;
  previousScanId?: string;
  currentScanId: string;
  newIssues: IssueHistoryEntry[];
  openIssues: IssueHistoryEntry[];
  fixedIssues: IssueHistoryEntry[];
  ignoredIssues: IssueHistoryEntry[];
  reopenedIssues: IssueHistoryEntry[];
  scoreDelta: Record<string, number>;
  createdAt: string;
}

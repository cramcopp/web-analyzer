import type { AuditIssue, AuditIssueStatus } from '@/types/audit';
import type { IssueHistoryEntry, ScanDiff } from '@/types/monitoring';

type ScoreCarrier = {
  audit_id?: string;
  seo?: { score?: number };
  performance?: { score?: number };
  security?: { score?: number };
  accessibility?: { score?: number };
  compliance?: { score?: number };
  contentStrategy?: { score?: number };
  issues?: AuditIssue[];
};

function issueKey(issue: AuditIssue) {
  return [
    issue.issueType,
    issue.category,
    [...issue.affectedUrls].sort().join(','),
  ].join('|');
}

function toHistoryEntry(issue: AuditIssue, status: AuditIssueStatus): IssueHistoryEntry {
  return {
    issueId: issue.id,
    issueType: issue.issueType,
    status,
    severity: issue.severity,
    title: issue.title,
    affectedUrls: issue.affectedUrls,
  };
}

function scoreValue(scan: ScoreCarrier | null | undefined, key: keyof Pick<ScoreCarrier, 'seo' | 'performance' | 'security' | 'accessibility' | 'compliance' | 'contentStrategy'>) {
  return typeof scan?.[key]?.score === 'number' ? scan[key]!.score! : null;
}

export function compareScans(projectId: string, previousScan: ScoreCarrier | null, currentScan: ScoreCarrier): ScanDiff {
  const previousIssues = previousScan?.issues || [];
  const currentIssues = currentScan.issues || [];
  const previousByKey = new Map(previousIssues.map((issue) => [issueKey(issue), issue]));
  const currentByKey = new Map(currentIssues.map((issue) => [issueKey(issue), issue]));

  const newIssues = currentIssues
    .filter((issue) => !previousByKey.has(issueKey(issue)))
    .map((issue) => toHistoryEntry(issue, 'new'));

  const openIssues = currentIssues
    .filter((issue) => previousByKey.has(issueKey(issue)) && issue.status !== 'ignored')
    .map((issue) => toHistoryEntry(issue, issue.status === 'reopened' ? 'reopened' : 'open'));

  const fixedIssues = previousIssues
    .filter((issue) => !currentByKey.has(issueKey(issue)))
    .map((issue) => toHistoryEntry(issue, 'fixed'));

  const ignoredIssues = currentIssues
    .filter((issue) => issue.status === 'ignored')
    .map((issue) => toHistoryEntry(issue, 'ignored'));

  const reopenedIssues = currentIssues
    .filter((issue) => previousByKey.get(issueKey(issue))?.status === 'fixed')
    .map((issue) => toHistoryEntry(issue, 'reopened'));

  const scoreKeys = ['seo', 'performance', 'security', 'accessibility', 'compliance', 'contentStrategy'] as const;
  const scoreDelta = scoreKeys.reduce<Record<string, number>>((acc, key) => {
    const previous = scoreValue(previousScan, key);
    const current = scoreValue(currentScan, key);
    if (previous !== null && current !== null) {
      acc[key] = current - previous;
    }
    return acc;
  }, {});

  return {
    id: `diff_${currentScan.audit_id || Date.now().toString(36)}`,
    projectId,
    previousScanId: previousScan?.audit_id,
    currentScanId: currentScan.audit_id || '',
    newIssues,
    openIssues,
    fixedIssues,
    ignoredIssues,
    reopenedIssues,
    scoreDelta,
    createdAt: new Date().toISOString(),
  };
}

import type { AuditCategory, AuditIssue, AuditScoreBreakdown, AuditSeverity, ScoreKey } from '@/types/audit';

function severityWeight(severity: AuditSeverity) {
  switch (severity) {
    case 'critical':
      return 30;
    case 'high':
      return 18;
    case 'medium':
      return 10;
    case 'low':
      return 4;
    case 'info':
      return 1;
    default:
      return 0;
  }
}

function categoryToScoreKey(category: AuditCategory): ScoreKey {
  switch (category) {
    case 'seo':
      return 'seo';
    case 'performance':
      return 'performance';
    case 'security':
      return 'security';
    case 'accessibility':
      return 'accessibility';
    case 'compliance':
      return 'compliance';
    case 'content':
      return 'contentStrategy';
    case 'ai_visibility':
      return 'aiVisibility';
    default:
      return 'seo';
  }
}

function emptyBreakdown(): AuditScoreBreakdown {
  return {
    seo: { score: 100, deductions: [] },
    performance: { score: 100, deductions: [] },
    security: { score: 100, deductions: [] },
    accessibility: { score: 100, deductions: [] },
    compliance: { score: 100, deductions: [] },
    contentStrategy: { score: 100, deductions: [] },
    aiVisibility: { score: 100, deductions: [] },
  };
}

export function calculateIssueScores(issues: AuditIssue[]) {
  const breakdown = emptyBreakdown();

  for (const issue of issues) {
    const key = categoryToScoreKey(issue.category);
    const confidence = Number.isFinite(issue.confidence) ? Math.max(0, Math.min(1, issue.confidence)) : 0.5;
    const points = Math.round(severityWeight(issue.severity) * confidence);

    breakdown[key].deductions.push({
      issueId: issue.id,
      issueType: issue.issueType,
      title: issue.title,
      severity: issue.severity,
      confidence,
      points,
    });
  }

  const scores = {
    seo: 100,
    performance: 100,
    security: 100,
    accessibility: 100,
    compliance: 100,
    contentStrategy: 100,
    aiVisibility: 100,
  };

  for (const key of Object.keys(breakdown) as ScoreKey[]) {
    const totalDeduction = breakdown[key].deductions.reduce((sum, item) => sum + item.points, 0);
    const score = Math.max(0, Math.min(100, 100 - totalDeduction));
    breakdown[key].score = score;
    scores[key] = score;
  }

  return { scores, breakdown };
}

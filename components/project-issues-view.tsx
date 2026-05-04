'use client';

import { CheckCircle2, FileSearch, ListChecks } from 'lucide-react';
import DataSourceBadge from './data-source-badge';
import type { AuditIssue, AuditSeverity } from '@/types/audit';
import { applyReportVisibilityLimits, buildVisibilitySummaryFromReport } from '@/lib/plans';

type ProjectIssuesReport = {
  issues?: AuditIssue[];
};

const severityOrder: Record<AuditSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function severityClass(severity: AuditSeverity) {
  if (severity === 'critical') return 'text-red-600 bg-red-500/10 border-red-500/20';
  if (severity === 'high') return 'text-orange-600 bg-orange-500/10 border-orange-500/20';
  if (severity === 'medium') return 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20';
  if (severity === 'low') return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
  return 'text-[#888] bg-zinc-500/10 border-zinc-500/20';
}

export default function ProjectIssuesView({ report, plan = 'free' }: { report: ProjectIssuesReport | null; plan?: string }) {
  const visibleReport = applyReportVisibilityLimits(report || {}, plan) as ProjectIssuesReport & { visibilityLimits?: any };
  const visibility = visibleReport.visibilityLimits || buildVisibilitySummaryFromReport(report || {}, plan);
  const issues = [...(visibleReport?.issues || [])].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const openIssues = issues.filter((issue) => issue.status !== 'fixed' && issue.status !== 'ignored');
  const fixedIssues = issues.filter((issue) => issue.status === 'fixed');
  const ignoredIssues = issues.filter((issue) => issue.status === 'ignored');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <ListChecks className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Audit Issue Register</span>
            <DataSourceBadge type={issues.length > 0 ? 'real' : 'unavailable'} label={issues.length > 0 ? 'Scanner Issues' : 'Keine Issues'} />
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Issues</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Deterministische Audit-Befunde mit Issue ID, Evidence-Referenzen, Confidence und Status.
          </p>
          {visibility.hiddenIssueUrls > 0 && (
            <p className="text-[10px] text-[#D4AF37] font-black mt-3 uppercase tracking-widest">
              {visibility.hiddenIssueUrls} Issue-URLs wegen Planlimit ausgeblendet
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Gesamt</span>
          <span className="text-[28px] font-black text-[#1A1A1A] dark:text-zinc-100">{issues.length}</span>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Offen</span>
          <span className="text-[28px] font-black text-red-500">{openIssues.length}</span>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Fixed</span>
          <span className="text-[28px] font-black text-[#27AE60]">{fixedIssues.length}</span>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Ignored</span>
          <span className="text-[28px] font-black text-[#888]">{ignoredIssues.length}</span>
        </div>
      </div>

      {issues.length === 0 ? (
        <section className="min-h-[280px] bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 flex flex-col items-center justify-center text-center gap-4">
          <CheckCircle2 className="w-10 h-10 text-[#27AE60]" />
          <h3 className="text-[18px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine Issues verfügbar</h3>
          <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest max-w-md">
            Starte einen Audit-Scan. Diese Ansicht zeigt nur echte Scanner-Befunde, keine Demo- oder Provider-Platzhalter.
          </p>
        </section>
      ) : (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 divide-y divide-[#EEE] dark:divide-zinc-800">
          {issues.map((issue) => (
            <article key={issue.id} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${severityClass(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#888]">{issue.category}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#888]">{issue.status || 'open'}</span>
                    <DataSourceBadge type={issue.sourceType || 'real'} />
                  </div>
                  <h3 className="text-[16px] font-black text-[#1A1A1A] dark:text-zinc-100">{issue.title}</h3>
                  <p className="text-[12px] text-[#888] font-medium mt-2 max-w-3xl">{issue.description}</p>
                  <p className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 font-bold mt-3 max-w-3xl">{issue.fixHint}</p>
                </div>
                <div className="shrink-0 text-left lg:text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-1">Confidence</span>
                  <span className="text-[18px] font-black text-[#1A1A1A] dark:text-zinc-100">{Math.round(issue.confidence * 100)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-[11px]">
                <div className="lg:col-span-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Affected URLs</span>
                  {(issue.affectedUrls || []).slice(0, 3).map((url) => (
                    <p key={url} className="truncate font-mono text-[#1A1A1A] dark:text-zinc-100">{url}</p>
                  ))}
                  {(issue.affectedUrls || []).length === 0 && <p className="text-[#888] font-bold uppercase tracking-widest">Nicht verfügbar</p>}
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">Evidence</span>
                  {(issue.evidenceRefs || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {issue.evidenceRefs.slice(0, 4).map((ref) => (
                        <span key={ref} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 font-mono text-[10px] text-[#888]">
                          <FileSearch className="w-3 h-3" /> {ref}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#888] font-bold uppercase tracking-widest">Keine Evidence-Referenz</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

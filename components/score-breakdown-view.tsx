'use client';

import { AlertTriangle, ListChecks } from 'lucide-react';
import type { AuditScoreBreakdown, ScoreDeduction, ScoreKey } from '@/types/audit';

const SCORE_ORDER: ScoreKey[] = [
  'seo',
  'performance',
  'security',
  'accessibility',
  'compliance',
  'contentStrategy',
  'aiVisibility',
];

function topDeductions(deductions: ScoreDeduction[]) {
  return [...deductions].sort((a, b) => b.points - a.points).slice(0, 4);
}

function scoreLabel(key: ScoreKey) {
  switch (key) {
    case 'seo':
      return 'SEO';
    case 'performance':
      return 'Performance';
    case 'security':
      return 'Security';
    case 'accessibility':
      return 'Accessibility';
    case 'compliance':
      return 'Compliance';
    case 'contentStrategy':
      return 'Content Strategy';
    case 'aiVisibility':
      return 'AI Visibility';
  }
}

function scoreItem(breakdown: AuditScoreBreakdown, key: ScoreKey) {
  switch (key) {
    case 'seo':
      return breakdown.seo;
    case 'performance':
      return breakdown.performance;
    case 'security':
      return breakdown.security;
    case 'accessibility':
      return breakdown.accessibility;
    case 'compliance':
      return breakdown.compliance;
    case 'contentStrategy':
      return breakdown.contentStrategy;
    case 'aiVisibility':
      return breakdown.aiVisibility;
  }
}

export default function ScoreBreakdownView({ breakdown }: { breakdown?: AuditScoreBreakdown | null }) {
  if (!breakdown) return null;

  return (
    <section className="mb-[80px] bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 scroll-mt-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Issue-Based Scoring</span>
          </div>
          <h3 className="text-[24px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">
            Score-Erklaerung
          </h3>
          <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest mt-2 max-w-2xl">
            Jeder Score startet bei 100. Abzuege entstehen ausschliesslich aus Issues, gewichtet nach Severity und Confidence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SCORE_ORDER.map((key) => {
          const item = scoreItem(breakdown, key);
          if (!item) return null;
          const totalDeduction = item.deductions.reduce((sum, deduction) => sum + deduction.points, 0);
          const deductions = topDeductions(item.deductions);

          return (
            <div key={key} className="border border-[#EEE] dark:border-zinc-800 bg-[#F9F9F9] dark:bg-zinc-950 p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-[13px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">
                    {scoreLabel(key)}
                  </h4>
                  <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest mt-1">
                    100 - {totalDeduction} Punkte Abzug
                  </p>
                </div>
                <span className="text-[28px] font-black text-[#D4AF37] leading-none">{item.score}</span>
              </div>

              {deductions.length === 0 ? (
                <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest">
                  Keine Issues in dieser Kategorie.
                </p>
              ) : (
                <div className="space-y-3">
                  {deductions.map((deduction) => (
                    <div key={deduction.issueId} className="flex items-start gap-3 border-t border-[#EEE] dark:border-zinc-800 pt-3">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-black text-[#1A1A1A] dark:text-zinc-100 truncate">
                            {deduction.title}
                          </span>
                          <span className="text-[10px] font-black text-[#D4AF37] shrink-0">
                            -{deduction.points}
                          </span>
                        </div>
                        <p className="text-[9px] text-[#888] font-bold uppercase tracking-widest mt-1">
                          {deduction.issueType} | {deduction.severity} | Confidence {Math.round(deduction.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

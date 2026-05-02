'use client';

import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  FileSearch,
  MessagesSquare,
  Network,
  SearchCheck,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import DataSourceBadge from './data-source-badge';
import { useProviderStatus } from '@/hooks/use-provider-status';
import type { AiVisibilityCheckSet, AiVisibilitySignalCheck } from '@/types/ai-visibility';

function statusTone(status?: string) {
  if (status === 'ok' || status === 'allowed' || status === 'provider_configured') return 'text-[#27AE60]';
  if (status === 'blocked' || status === 'warning') return 'text-[#D4AF37]';
  return 'text-[#888]';
}

function StatusMarker({ status }: { status?: string }) {
  const className = `w-3.5 h-3.5 ${statusTone(status)}`;
  return status === 'ok' || status === 'allowed' || status === 'provider_configured'
    ? <CheckCircle2 className={className} />
    : <ShieldAlert className={className} />;
}

function CheckCard({ check, icon: Icon }: { check: AiVisibilitySignalCheck; icon: any }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <Icon className={`w-5 h-5 ${statusTone(check.status)}`} />
        <DataSourceBadge type={check.sourceType} />
      </div>
      <h3 className="text-[11px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-3">{check.label}</h3>
      <div className="flex items-center gap-2 mb-3">
        <StatusMarker status={check.status} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${statusTone(check.status)}`}>{check.status}</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-[#888]">{Math.round(check.confidence * 100)}%</span>
      </div>
      {check.missing.length > 0 ? (
        <p className="text-[10px] text-[#888] font-bold leading-relaxed">Fehlt: {check.missing.join(', ')}</p>
      ) : (
        <p className="text-[10px] text-[#888] font-bold leading-relaxed">Signale: {check.signals.join(', ') || 'OK'}</p>
      )}
    </div>
  );
}

export default function ProjectAiVisibilityView({ report }: { report: any }) {
  const providerStatus = useProviderStatus();
  if (!report) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#888] mb-4">
          <BrainCircuit className="w-8 h-8" />
        </div>
        <h3 className="text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine AI-Visibility Daten</h3>
        <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest">Starte einen Scan fuer heuristische AI-Visibility Checks.</p>
      </div>
    );
  }

  const issues = report.issues || [];
  const aiIssues = issues.filter((issue: any) => issue.category === 'ai_visibility');
  const score = report.aiVisibility?.score ?? report.scoreBreakdown?.aiVisibility?.score ?? 100;
  const checks = report.aiVisibility?.checks as AiVisibilityCheckSet | undefined;
  const crawlerChecks = Array.isArray(checks?.crawlerAccess) ? checks!.crawlerAccess : [];
  const aiVisibilityFacts = report.aiVisibilityFacts || [];
  const aiProviderConfigured = Boolean(providerStatus?.availability.aiVisibility || report.providerAvailability?.aiVisibility);
  const serpProviderConfigured = Boolean(providerStatus?.availability.serp || report.providerAvailability?.serp);
  const signalChecks = checks ? [
    { check: checks.brandEntity, icon: BrainCircuit },
    { check: checks.organizationSchema, icon: Network },
    { check: checks.sameAsLinks, icon: FileSearch },
    { check: checks.aboutContactImpressum, icon: SearchCheck },
    { check: checks.snippetReadiness, icon: Sparkles },
    { check: checks.faqDefinitionHowTo, icon: MessagesSquare },
  ].filter((item) => item.check) : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <BrainCircuit className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">AI Visibility Toolkit</span>
            <DataSourceBadge type="heuristic" label="Score Heuristik" />
            <DataSourceBadge type={aiProviderConfigured ? 'provider' : 'unavailable'} label={aiProviderConfigured ? 'Prompt Provider konfiguriert' : 'Prompt Provider fehlt'} />
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">AI Visibility</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Heuristische Checks fuer AI-Crawler, robots.txt, Brand Entity, Schema, SameAs, DACH-Vertrauensstruktur und AI-Snippet-Eignung.
          </p>
        </div>
        <div className="bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 px-6 py-4">
          <span className="text-[9px] font-black uppercase tracking-widest block opacity-60">Heuristic Score</span>
          <span className="text-[32px] font-black leading-none">{score}</span>
        </div>
      </div>

      <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#D4AF37]" /> AI Crawler Access
          </h3>
          <DataSourceBadge type={crawlerChecks.length > 0 ? 'heuristic' : 'unavailable'} label={crawlerChecks.length > 0 ? 'robots.txt Check' : 'Neuer Scan noetig'} />
        </div>
        {crawlerChecks.length === 0 ? (
          <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest">Dieser Report enthaelt noch keine strukturierte AI-Crawler-Matrix.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {crawlerChecks.map((check) => {
              return (
                <div key={check.bot} className="p-5 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800">
                  <Bot className={`w-5 h-5 mb-4 ${statusTone(check.status)}`} />
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-3">{check.label}</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusMarker status={check.status} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${statusTone(check.status)}`}>{check.status}</span>
                  </div>
                  <p className="text-[10px] text-[#888] font-bold">{check.rule}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {signalChecks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {signalChecks.map(({ check, icon }) => (
            <CheckCard key={check.key} check={check} icon={icon} />
          ))}
        </div>
      ) : (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 text-center">
          <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest">Strukturierte Entity-/Snippet-Checks erscheinen nach dem naechsten Scan.</p>
        </section>
      )}

      <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">AI Visibility Issues</h3>
          <DataSourceBadge type="heuristic" />
        </div>
        {aiIssues.length === 0 ? (
          <div className="p-8 text-center text-[11px] text-[#888] font-bold uppercase tracking-widest">
            Keine AI-Visibility Issues aus den aktuellen Heuristiken.
          </div>
        ) : (
          <div className="divide-y divide-[#EEE] dark:divide-zinc-800">
            {aiIssues.map((issue: any) => (
              <div key={issue.id} className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">{issue.severity}</span>
                    <DataSourceBadge type={issue.sourceType || 'heuristic'} />
                  </div>
                  <h4 className="text-[15px] font-black text-[#1A1A1A] dark:text-zinc-100">{issue.title}</h4>
                  <p className="text-[12px] text-[#888] font-medium mt-1 max-w-2xl">{issue.description}</p>
                  <p className="text-[11px] text-[#1A1A1A] dark:text-zinc-100 font-bold mt-3">{issue.fixHint}</p>
                </div>
                <span className="text-[12px] font-black text-[#1A1A1A] dark:text-zinc-100">{Math.round((issue.confidence || 0) * 100)}%</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="bg-[#1A1A1A] dark:bg-zinc-950 border border-white/5 p-6">
        <h3 className="text-[14px] font-black uppercase tracking-widest text-white mb-3">Provider Roadmap</h3>
        <div className="flex flex-wrap gap-2">
          <DataSourceBadge type={serpProviderConfigured ? 'provider' : 'unavailable'} label={serpProviderConfigured ? 'AI Overview via SERP bereit' : 'AI Overview Tracking spaeter via SERP'} />
          <DataSourceBadge type={aiProviderConfigured ? 'provider' : 'unavailable'} label={aiProviderConfigured ? `${aiVisibilityFacts.length} Prompt Facts` : 'Prompt Monitoring spaeter'} />
          <DataSourceBadge type="heuristic" label="Robots/Schema aktiv" />
        </div>
      </div>
    </div>
  );
}

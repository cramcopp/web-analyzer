'use client';

import { ArrowRight, ExternalLink, Search, Trophy } from 'lucide-react';
import { AnalysisResult } from '@/lib/scanner/types';
import { useProviderStatus } from '@/hooks/use-provider-status';
import DataSourceBadge from './data-source-badge';

export default function ProjectCompetitionView({ report }: { report: AnalysisResult | null }) {
  const providerStatus = useProviderStatus();

  if (!report) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#888] mb-4">
          <Trophy className="w-8 h-8" />
        </div>
        <h3 className="text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine Daten verfügbar</h3>
        <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest italic">Starten Sie einen Scan, um Wettbewerber-Analysen zu erhalten.</p>
      </div>
    );
  }

  const competitorFacts = report.competitorFacts || [];
  const trafficFacts = report.trafficFacts || [];
  const aiCompetitorHints = report.competitorBenchmarking || [];
  const marketProviderConfigured = Boolean(
    providerStatus?.availability.traffic ||
    providerStatus?.availability.serp ||
    report.providerAvailability?.traffic ||
    report.providerAvailability?.serp
  );
  const hasProviderFacts = competitorFacts.length > 0 || trafficFacts.length > 0;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Market Intelligence</span>
            <DataSourceBadge
              type={hasProviderFacts ? 'provider' : marketProviderConfigured ? 'provider' : 'unavailable'}
              label={hasProviderFacts ? 'Provider Facts' : marketProviderConfigured ? 'Provider konfiguriert' : 'Provider fehlt'}
            />
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Wettbewerber</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Traffic-, Keyword-, Ranking- und Sichtbarkeitswerte werden nur als echte Provider-Facts angezeigt.
          </p>
        </div>
      </div>

      {!hasProviderFacts && (
        <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-10 flex flex-col items-center text-center gap-4">
          <Trophy className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
          <h3 className="text-[18px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">
            {marketProviderConfigured ? 'Noch keine Wettbewerber-Facts abgerufen' : 'Wettbewerber-Provider noch nicht verbunden'}
          </h3>
          <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest max-w-xl">
            Keine Traffic-, Keyword-, Ranking- oder Sichtbarkeitswerte werden simuliert.
          </p>
          <DataSourceBadge type={marketProviderConfigured ? 'provider' : 'unavailable'} label={marketProviderConfigured ? 'Provider bereit' : 'Keine Provider-Fakten'} />
        </div>
      )}

      {competitorFacts.length > 0 && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between">
            <h4 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Competitor Facts</h4>
            <DataSourceBadge type="provider" />
          </div>
          <table className="w-full text-left">
            <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
              {competitorFacts.map((fact: any) => (
                <tr key={`${fact.competitorDomain}-${fact.createdAt}`}>
                  <td className="px-6 py-4 text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100">{fact.competitorDomain}</td>
                  <td className="px-6 py-4 text-[11px] font-bold text-[#888]">{fact.source}</td>
                  <td className="px-6 py-4 text-[11px] font-bold text-[#888]">{fact.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {trafficFacts.length > 0 && (
        <section className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between">
            <h4 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Traffic Facts</h4>
            <DataSourceBadge type="provider" />
          </div>
          <table className="w-full text-left">
            <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
              {trafficFacts.map((fact: any) => (
                <tr key={`${fact.domain}-${fact.channel}-${fact.fetchedAt}`}>
                  <td className="px-6 py-4 text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100">{fact.domain}</td>
                  <td className="px-6 py-4 text-[11px] font-bold text-[#888]">{fact.channel}</td>
                  <td className="px-6 py-4 text-[13px] font-black text-[#D4AF37]">{fact.visitsEstimate ?? 'n/a'}</td>
                  <td className="px-6 py-4"><DataSourceBadge type="provider" provider={fact.provider} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {aiCompetitorHints.length > 0 && (
        <div className="p-10 bg-[#1A1A1A] dark:bg-zinc-950 border-t-4 border-[#D4AF37] relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <h4 className="text-[12px] font-black uppercase tracking-[3px] text-[#D4AF37] mb-4">KI-Hinweise, keine Markt-Fakten</h4>
            <p className="text-[16px] font-bold text-white leading-tight mb-6">
              Diese Domains stammen aus dem KI-Bericht und werden nicht als Traffic-, Ranking- oder Sichtbarkeitswerte behandelt.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiCompetitorHints.slice(0, 6).map((item: any) => (
                <div key={item.url || item.name} className="bg-white/5 border border-white/10 p-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[12px] font-black text-white block">{item.name || item.url}</span>
                    <DataSourceBadge type="ai_inferred" label="Hinweis" className="mt-2" />
                  </div>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37]">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <Search className="w-4 h-4 text-[#D4AF37]" />
                  )}
                </div>
              ))}
            </div>
            <button className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white opacity-60 cursor-not-allowed">
              Provider-Vergleich später <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

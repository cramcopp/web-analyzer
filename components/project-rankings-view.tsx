'use client';

import {
  BarChart,
  Plus,
  SearchCode,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { AnalysisResult } from '@/lib/scanner/types';
import { useProviderStatus } from '@/hooks/use-provider-status';
import DataSourceBadge from './data-source-badge';

export default function ProjectRankingsView({ report }: { report: AnalysisResult | null }) {
  const [newKeyword, setNewKeyword] = useState('');
  const [trackingList, setTrackingList] = useState<string[]>([]);
  const providerStatus = useProviderStatus();

  const handleAddKeyword = () => {
    const keyword = newKeyword.trim();
    if (!keyword) return;
    setTrackingList(prev => Array.from(new Set([keyword, ...prev])));
    setNewKeyword('');
  };

  const rankFacts = (report as any)?.rankFacts || [];
  const aiKeywordIdeas = report?.businessIntelligence?.keywordGapAnalysis || [];
  const rankProviderConfigured = Boolean(providerStatus?.availability.serp || providerStatus?.availability.gsc || report?.providerAvailability?.serp || report?.providerAvailability?.gsc);

  if (!report) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#888] mb-4">
          <TrendingUp className="w-8 h-8" />
        </div>
        <h3 className="text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine Daten verfuegbar</h3>
        <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest italic">Starten Sie einen Scan, um das Projekt zu laden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Visibility Tracking</span>
            <DataSourceBadge type={rankProviderConfigured ? 'provider' : 'unavailable'} label={rankProviderConfigured ? 'Provider konfiguriert' : 'Rank-Provider fehlt'} />
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Rankings & Keywords</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Ranking-Positionen, Suchvolumen und Sichtbarkeitsverlauf werden ohne echten SERP-Provider nicht angezeigt.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BarChart className="w-5 h-5 text-[#D4AF37]" />
            <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Sichtbarkeits-Verlauf</h4>
          </div>
          <DataSourceBadge type="unavailable" label="Keine Provider-Fakten" />
        </div>
        <div className="h-[220px] w-full border border-dashed border-[#EEE] dark:border-zinc-800 bg-[#F5F5F3] dark:bg-zinc-950 flex flex-col items-center justify-center text-center gap-3">
          <TrendingUp className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
          <p className="text-[11px] text-[#888] font-black uppercase tracking-widest max-w-md">
            Kein Chart ohne echte Rankinghistorie. Verbinde spaeter DataForSEO, SerpApi oder GSC-Daten.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6 flex items-center gap-4">
            <div className="relative flex-1">
              <SearchCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
              <input
                type="text"
                placeholder="Keyword zur Beobachtung vormerken..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[13px] focus:outline-none focus:border-[#D4AF37] transition-all"
              />
            </div>
            <button
              onClick={handleAddKeyword}
              className="px-6 py-3 bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-[#D4AF37] hover:text-white transition-all shadow-lg flex items-center gap-2 min-w-[140px] justify-center"
            >
              <Plus className="w-4 h-4" />
              Vormerken
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between">
              <h4 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Ranking-Fakten</h4>
              <DataSourceBadge type={rankFacts.length > 0 ? 'provider' : 'unavailable'} />
            </div>
            {rankFacts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest">
                  {rankProviderConfigured ? 'Provider ist konfiguriert, aber es wurden noch keine Ranking-Fakten abgerufen.' : 'Provider noch nicht verbunden. Es werden keine simulierten Positionen oder Suchvolumen angezeigt.'}
                </p>
                {trackingList.length > 0 && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {trackingList.map((kw) => (
                      <span key={kw} className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[10px] font-black uppercase tracking-widest text-[#888]">
                        {kw} · ausstehend
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F5F5F3] dark:bg-zinc-950 border-b border-[#EEE] dark:border-zinc-800">
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Keyword</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Position</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">URL</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Provider</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
                  {rankFacts.map((fact: any) => (
                    <tr key={`${fact.keyword}-${fact.url}-${fact.checkedAt}`} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100">{fact.keyword}</td>
                      <td className="px-6 py-4 text-[13px] font-black text-[#D4AF37]">{fact.rank}</td>
                      <td className="px-6 py-4 text-[11px] font-bold text-[#888] break-all">{fact.url || 'Nicht verfuegbar'}</td>
                      <td className="px-6 py-4"><DataSourceBadge type="provider" provider={fact.provider} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#1A1A1A] dark:bg-zinc-950 p-8 border border-white/5 relative overflow-hidden">
            <h4 className="text-[14px] font-black uppercase tracking-widest text-[#D4AF37] mb-6 flex items-center gap-2">
              <Target className="w-4 h-4" /> AI Keyword Hinweise
            </h4>
            <div className="space-y-4">
              {aiKeywordIdeas.length > 0 ? aiKeywordIdeas.slice(0, 5).map((kw: string) => (
                <div key={kw} className="flex items-center justify-between border-b border-white/10 pb-3 gap-3">
                  <span className="text-[12px] font-bold text-zinc-300">{kw}</span>
                  <DataSourceBadge type="ai_inferred" label="Hinweis" />
                </div>
              )) : (
                <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">
                  Keine KI-Hinweise vorhanden.
                </p>
              )}
            </div>
            <p className="mt-6 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              Diese Hinweise sind keine Ranking- oder Volumen-Fakten.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

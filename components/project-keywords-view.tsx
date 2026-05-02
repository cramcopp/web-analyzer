'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  FileSearch,
  Info,
  PlugZap,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import { AnalysisResult } from '@/lib/scanner/types';
import { useProviderStatus } from '@/hooks/use-provider-status';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import DataSourceBadge from './data-source-badge';

export default function ProjectKeywordsView({ report }: { report: AnalysisResult | null }) {
  const [researchInput, setResearchInput] = useState('');
  const providerStatus = useProviderStatus();

  const topKeywordsFromPage = useMemo(() => {
    if (!report?.bodyText) return [];

    const stopWords = new Set(['dass', 'sind', 'haben', 'eine', 'oder', 'und', 'der', 'die', 'das', 'mit', 'von', 'fuer']);
    const words = report.bodyText.toLowerCase()
      .replace(/[^\w\s\u00e4\u00f6\u00fc]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    const freq: Record<string, number> = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([kw, count]) => ({ kw, count }));
  }, [report]);

  if (!report) return null;
  const keywordFacts = (report as any)?.keywordFacts || [];
  const keywordProviderConfigured = Boolean(providerStatus?.availability.keyword || report.providerAvailability?.keyword);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Discovery Module</span>
            <DataSourceBadge type="heuristic" label="On-Page" />
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Keyword Scan</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            On-Page-Worthaeufigkeit ist heuristisch. Suchvolumen, CPC und Difficulty brauchen einen echten Keyword-Provider.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <FileSearch className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Keyword Check (On-Page)</h3>
            <DataSourceBadge type="heuristic" />
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 space-y-6">
            {topKeywordsFromPage.length > 0 ? (
              <>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topKeywordsFromPage} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEE" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="kw" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }} width={80} />
                      <RechartsTooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '0px' }}
                        itemStyle={{ color: '#D4AF37', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                        labelStyle={{ display: 'none' }}
                        formatter={(value: any) => [`${value}x gefunden`, '']}
                      />
                      <Bar dataKey="count" fill="#D4AF37" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-8 pt-6 border-t border-[#EEE] dark:border-zinc-800">
                  <div className="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 border border-[#EEE] dark:border-zinc-800">
                    <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#888] font-medium leading-relaxed">
                      Diese Begriffe wurden im auslesbaren Textkoerper gezaehlt. Das ist kein Suchvolumen und keine Ranking-Aussage.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-center gap-4">
                <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-950 rounded-full flex items-center justify-center text-zinc-300 dark:text-zinc-800">
                  <FileSearch className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Keine Textdaten</h4>
                  <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest max-w-[220px] mx-auto">
                    Es konnte kein verwertbarer Text aus dem Crawl extrahiert werden.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Keyword Recherche</h3>
            <DataSourceBadge type={keywordProviderConfigured ? 'provider' : 'unavailable'} label={keywordProviderConfigured ? 'Provider konfiguriert' : 'Provider fehlt'} />
          </div>

          <div className="space-y-6">
            <div className="bg-[#1A1A1A] dark:bg-zinc-950 p-8 border border-white/5 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[2px] text-[#D4AF37] mb-3 block">Fokus-Thema vormerken</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="z.B. Digitalisierung, SEO Tools..."
                      value={researchInput}
                      onChange={(e) => setResearchInput(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-white text-[14px] font-medium focus:outline-none focus:border-[#D4AF37] transition-all"
                    />
                    <button
                      disabled
                      className="bg-zinc-700 text-zinc-400 px-6 py-3 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 cursor-not-allowed"
                    >
                      <PlugZap className="w-4 h-4" />
                      {keywordProviderConfigured ? 'Abruf spaeter' : 'Provider fehlt'}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  Keine simulierten Volumen, Difficulty- oder Potenzialwerte. Facts werden erst nach echtem Provider-Abruf gespeichert.
                </p>
              </div>
            </div>

            {keywordFacts.length > 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between">
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Keyword Facts</h4>
                  <DataSourceBadge type="provider" />
                </div>
                <table className="w-full text-left">
                  <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
                    {keywordFacts.map((fact: any) => (
                      <tr key={`${fact.keyword}-${fact.region}-${fact.device}`}>
                        <td className="px-5 py-4 text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-100">{fact.keyword}</td>
                        <td className="px-5 py-4 text-[11px] font-black text-[#D4AF37]">{fact.volume ?? 'n/a'}</td>
                        <td className="px-5 py-4 text-[11px] text-[#888] font-bold">{fact.provider}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 min-h-[300px] flex flex-col items-center justify-center text-center p-8 gap-4">
                <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-950 rounded-full flex items-center justify-center text-zinc-300 dark:text-zinc-800">
                  <Target className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">
                    {keywordProviderConfigured ? 'Noch keine Keyword-Facts abgerufen' : 'Provider noch nicht verbunden'}
                  </h4>
                  <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest italic max-w-sm">
                    DataForSEO, SerpApi oder ein anderer Keyword-Provider kann hier spaeter echte Facts liefern.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {report.businessIntelligence?.keywordGapAnalysis && (
        <div className="p-8 bg-[#D4AF37]/5 border border-[#D4AF37]/20 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-[18px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">KI-Hinweise aus dem Bericht</h4>
                <DataSourceBadge type="ai_inferred" />
              </div>
              <p className="text-[13px] text-[#888] font-medium leading-relaxed">
                Diese Begriffe sind KI-abgeleitete Themenhinweise aus vorhandenen Auditdaten. Sie sind keine Keyword-Volumen, Rankings oder Wettbewerber-Fakten.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center md:justify-end">
              {report.businessIntelligence.keywordGapAnalysis.map((kw: string) => (
                <div key={kw} className="px-4 py-2 bg-white dark:bg-zinc-900 border border-[#D4AF37]/30 shadow-lg flex items-center gap-3">
                  <span className="text-[13px] font-black text-[#1A1A1A] dark:text-zinc-100">{kw}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

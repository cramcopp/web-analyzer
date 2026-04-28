'use client';

import { useState, useMemo } from 'react';
import { 
  Search, Target, Sparkles, Plus, 
  RefreshCw, FileSearch, 
  ArrowRight, Info, Zap
} from 'lucide-react';
import { AnalysisResult } from '@/lib/scanner/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function ProjectKeywordsView({ report }: { report: AnalysisResult | null }) {
  const [researchInput, setResearchInput] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [researchResults, setResearchResults] = useState<any[]>([]);

  const handleResearch = () => {
    if (!researchInput) return;
    setIsResearching(true);
    // Simulate API call for keyword research
    setTimeout(() => {
      const mockSuggestions = [
        { kw: `${researchInput} Preise`, vol: '1.2k', diff: 'Mittel', opp: 'Hoch' },
        { kw: `Beste ${researchInput} Agentur`, vol: '850', diff: 'Hoch', opp: 'Mittel' },
        { kw: `${researchInput} Vergleich 2024`, vol: '2.4k', diff: 'Niedrig', opp: 'Maximal' },
        { kw: `${researchInput} Tipps für Anfänger`, vol: '500', diff: 'Niedrig', opp: 'Hoch' },
      ];
      setResearchResults(mockSuggestions);
      setIsResearching(false);
    }, 2000);
  };

  const topKeywordsFromPage = useMemo(() => {
    if (!report?.bodyText) return [];
    
    // Simple frequency analysis for demonstration
    const words = report.bodyText.toLowerCase()
      .replace(/[^\w\säöü]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['dass', 'sind', 'haben', 'eine', 'oder'].includes(w));
    
    const freq: Record<string, number> = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);
    
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([kw, count]) => ({ kw, count }));
  }, [report]);

  if (!report) return null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Discovery Module</span>
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Keyword Scan</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Analysiere bestehende Keywords und finde neue Wachstumschancen für {new URL(report.urlObj).hostname}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Keyword Check Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <FileSearch className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Keyword Check (On-Page)</h3>
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
                        Diese Begriffe wurden am häufigsten im Textkörper gefunden. Achte darauf, dass dein Hauptkeyword in den H1- und H2-Tags sowie in den ersten 100 Wörtern erscheint.
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
                  <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Keine Daten</h4>
                  <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest max-w-[200px] mx-auto">
                    Es konnte kein Text auf der Seite gefunden werden. Bitte Deep-Scan durchführen.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyword Research Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Keyword Recherche</h3>
          </div>

          <div className="space-y-6">
            {/* Input Area */}
            <div className="bg-[#1A1A1A] dark:bg-zinc-950 p-8 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Zap className="w-24 h-24 text-white" />
              </div>
              <div className="relative z-10 space-y-6">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[2px] text-[#D4AF37] mb-3 block">Fokus-Thema eingeben</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="z.B. Digitalisierung, SEO Tools..."
                      value={researchInput}
                      onChange={(e) => setResearchInput(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 px-4 py-3 text-white text-[14px] font-medium focus:outline-none focus:border-[#D4AF37] transition-all"
                    />
                    <button 
                      onClick={handleResearch}
                      disabled={isResearching || !researchInput}
                      className="bg-[#D4AF37] text-white px-6 py-3 font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-[#1A1A1A] transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isResearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Recherche
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Die KI analysiert Trends und Wettbewerber-Lücken.</p>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden min-h-[300px]">
              {researchResults.length > 0 ? (
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-[#F5F5F3] dark:bg-zinc-950 border-b border-[#EEE] dark:border-zinc-800">
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Vorschlag</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Volumen</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Konkurrenz</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Potenzial</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
                      {researchResults.map((item, i) => (
                        <tr key={i} className="hover:bg-black/[0.01] transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100">{item.kw}</span>
                          </td>
                          <td className="px-6 py-4 text-[12px] font-bold text-[#888]">{item.vol}</td>
                          <td className="px-6 py-4 text-[12px] font-bold text-[#888]">{item.diff}</td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-black uppercase text-[#27AE60] bg-[#27AE60]/10 px-2 py-0.5 rounded-sm">
                              {item.opp}
                            </span>
                          </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-center p-8 gap-4">
                  <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-950 rounded-full flex items-center justify-center text-zinc-300 dark:text-zinc-800">
                    <Target className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Keine Daten</h4>
                    <p className="text-[11px] text-[#888] font-bold uppercase tracking-widest italic">Starte eine Recherche oben.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Gap Analysis Integration */}
      {report.businessIntelligence?.keywordGapAnalysis && (
        <div className="p-8 bg-[#D4AF37]/5 border border-[#D4AF37]/20 relative overflow-hidden">
           <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="max-w-2xl">
                 <h4 className="text-[18px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100 mb-2">Automatisierte Keyword-Lücken Analyse</h4>
                 <p className="text-[13px] text-[#888] font-medium leading-relaxed">
                    Unsere KI hat diese Begriffe als ungenutztes Potenzial für deine Nische identifiziert. Diese Keywords werden von Wettbewerbern genutzt, fehlen aber auf deiner Seite.
                 </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                 {report.businessIntelligence.keywordGapAnalysis.map((kw: string, i: number) => (
                    <div key={i} className="px-4 py-2 bg-white dark:bg-zinc-900 border border-[#D4AF37]/30 shadow-lg flex items-center gap-3 animate-in fade-in zoom-in duration-500" style={{ animationDelay: `${i * 100}ms` }}>
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

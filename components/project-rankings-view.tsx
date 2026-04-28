'use client';

import { 
  TrendingUp, Search, Target, Sparkles, 
  ArrowUpRight, ArrowDownRight, BarChart, Globe,
  Plus, SearchCode, Zap, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';
import { useState, useMemo } from 'react';
import { AnalysisResult } from '@/lib/scanner/types';

export default function ProjectRankingsView({ report }: { report: AnalysisResult | null }) {
  const [newKeyword, setNewKeyword] = useState('');
  const [trackingList, setTrackingList] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleAddKeyword = () => {
    if (!newKeyword) return;
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setTrackingList(prev => [newKeyword, ...prev]);
      setNewKeyword('');
      setIsSearching(false);
    }, 1500);
  };

  // Mock data for visibility chart
  const visibilityData = useMemo(() => [
    { date: '01.04', score: 45 },
    { date: '05.04', score: 48 },
    { date: '10.04', score: 47 },
    { date: '15.04', score: 52 },
    { date: '20.04', score: 55 },
    { date: '25.04', score: 58 },
    { date: 'Heute', score: 62 },
  ], []);

  const keywords = useMemo(() => {
    if (!report || !report.businessIntelligence) return [];
    
    // Mix AI suggested keywords with some mock ranking data
    return report.businessIntelligence.keywordGapAnalysis.map((kw: string, i: number) => ({
      keyword: kw,
      pos: Math.floor(Math.random() * 50) + 1,
      change: Math.floor(Math.random() * 10) - 5,
      volume: (Math.floor(Math.random() * 20) + 1) * 100,
      difficulty: Math.floor(Math.random() * 40) + 30
    })).sort((a: any, b: any) => a.pos - b.pos);
  }, [report]);

  if (!report) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#888] mb-4">
          <TrendingUp className="w-8 h-8" />
        </div>
        <h3 className="text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine Daten verfügbar</h3>
        <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest italic">Starten Sie einen Scan, um Ranking-Daten zu generieren.</p>
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
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Rankings & Keywords</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Überwachen Sie Ihre Suchsichtbarkeit und analysieren Sie Keyword-Chancen basierend auf KI-Insights.
          </p>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right">
              <span className="text-[9px] font-black text-[#888] uppercase tracking-widest block">Sichtbarkeits-Index</span>
              <div className="flex items-center gap-2 justify-end">
                 <span className="text-[28px] font-black text-[#1A1A1A] dark:text-zinc-100 leading-none">62.4</span>
                 <span className="text-[12px] font-bold text-[#27AE60] flex items-center bg-[#27AE60]/10 px-1.5 py-0.5 rounded-sm">+4.2%</span>
              </div>
           </div>
        </div>
      </div>

      {/* Visibility Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <BarChart className="w-5 h-5 text-[#D4AF37]" />
               <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Sichtbarkeits-Verlauf</h4>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-[#D4AF37] rounded-full" />
               <span className="text-[10px] font-black uppercase text-[#888]">Google.de Desktop</span>
            </div>
         </div>
         <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={visibilityData}>
                  <defs>
                     <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEE" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#888' }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#888' }} />
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '0px' }}
                     itemStyle={{ color: '#D4AF37', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                     labelStyle={{ color: '#888', fontSize: '9px', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Top Keywords Table */}
         <div className="lg:col-span-2 space-y-6">
            {/* Keyword Input */}
            <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-6 flex items-center gap-4">
               <div className="relative flex-1">
                  <SearchCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                  <input 
                    type="text" 
                    placeholder="Keyword eingeben (z.B. 'SEO Agentur Berlin')..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[13px] focus:outline-none focus:border-[#D4AF37] transition-all"
                  />
               </div>
               <button 
                 onClick={handleAddKeyword}
                 disabled={isSearching}
                 className="px-6 py-3 bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest hover:bg-[#D4AF37] hover:text-white transition-all shadow-lg flex items-center gap-2 min-w-[140px] justify-center"
               >
                 {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                 {isSearching ? 'Prüfe...' : 'Tracken'}
               </button>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
               <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between">
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Top Rankings</h4>
                  <Globe className="w-4 h-4 text-[#888]" />
               </div>
               <table className="w-full text-left">
                  <thead>
                     <tr className="bg-[#F5F5F3] dark:bg-zinc-950 border-b border-[#EEE] dark:border-zinc-800">
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Keyword</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Position</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Volumen</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Difficulty</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
                     {trackingList.map((kw, i) => (
                       <tr key={`track-${i}`} className="bg-[#D4AF37]/5 animate-in fade-in slide-in-from-left-4 duration-500">
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                                <span className="text-[13px] font-black text-[#1A1A1A] dark:text-zinc-100">{kw}</span>
                                <span className="text-[9px] text-[#D4AF37] font-black uppercase tracking-widest">Live Track</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <span className="text-[14px] font-black text-[#1A1A1A] dark:text-zinc-100">#12</span>
                                <div className="flex items-center text-[10px] font-black text-[#27AE60]">
                                   <ArrowUpRight className="w-3 h-3" /> NEU
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-[12px] font-bold text-[#888]">Berechne...</td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(dot => (
                                  <div key={dot} className={`w-1.5 h-1.5 rounded-full ${dot <= 3 ? 'bg-[#D4AF37]' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                                ))}
                             </div>
                          </td>
                       </tr>
                     ))}
                     {keywords.map((kw: any, idx: number) => (
                        <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                 <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100">{kw.keyword}</span>
                                 <span className="text-[10px] text-[#27AE60] font-black uppercase">Gefunden</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <span className="text-[14px] font-black text-[#1A1A1A] dark:text-zinc-100">{kw.pos}</span>
                                 {kw.change !== 0 && (
                                   <div className={`flex items-center text-[10px] font-black ${kw.change > 0 ? 'text-[#27AE60]' : 'text-red-500'}`}>
                                      {kw.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                      {Math.abs(kw.change)}
                                   </div>
                                 )}
                              </div>
                           </td>
                           <td className="px-6 py-4 text-[12px] font-bold text-[#888]">{kw.volume}</td>
                           <td className="px-6 py-4">
                              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                 <div className="h-full bg-[#D4AF37]" style={{ width: `${kw.difficulty}%` }} />
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* AI Opportunities */}
         <div className="space-y-6">
            <div className="bg-[#1A1A1A] dark:bg-zinc-950 p-8 border border-white/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-12 h-12 text-[#D4AF37]" />
               </div>
               <div className="relative z-10">
                  <h4 className="text-[14px] font-black uppercase tracking-widest text-[#D4AF37] mb-6 flex items-center gap-2">
                     <Target className="w-4 h-4" /> AI Keyword Gap
                  </h4>
                  <div className="space-y-4">
                     {report.businessIntelligence?.keywordGapAnalysis.slice(0, 5).map((kw: string, i: number) => (
                        <div key={i} className="flex items-center justify-between border-b border-white/10 pb-3">
                           <span className="text-[12px] font-bold text-zinc-300">{kw}</span>
                           <span className="text-[9px] font-black uppercase text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-sm">Vorschlag</span>
                        </div>
                     ))}
                  </div>
                  <button className="w-full mt-8 py-3 bg-[#D4AF37] text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-[#1A1A1A] transition-all">
                     Alle Chancen anzeigen
                  </button>
               </div>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
               <h5 className="text-[11px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 mb-4">Nischen-Fokus</h5>
               <p className="text-[12px] text-[#888] font-medium leading-relaxed">
                  Deine Seite wurde in der Nische <span className="text-[#1A1A1A] dark:text-zinc-100 font-bold uppercase tracking-tighter">"{report.businessIntelligence?.businessNiche}"</span> erkannt. 
                  Die oben genannten Keywords haben das höchste Potenzial für diese Zielgruppe.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { 
  Trophy, Target, ShieldCheck, Zap, 
  Search, ArrowRight, ExternalLink, BarChart3 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { AnalysisResult } from '@/lib/scanner/types';

export default function ProjectCompetitionView({ report }: { report: AnalysisResult | null }) {
  const competitorData = useMemo(() => {
    if (!report || !report.competitorBenchmarking) return [];
    
    const myData = {
      name: 'Mein Projekt',
      seo: report.seo?.score || 0,
      security: report.security?.score || 0,
      performance: report.performance?.score || 0,
      isMe: true
    };

    const comps = report.competitorBenchmarking.map((c: any) => ({
      name: c.name,
      seo: c.estimatedScores.seo,
      security: c.estimatedScores.security,
      performance: c.estimatedScores.performance,
      url: c.url,
      isMe: false
    }));

    return [myData, ...comps];
  }, [report]);

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

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Market Intelligence</span>
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Wettbewerber</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Vergleichen Sie Ihre Performance direkt mit den Top-Playern Ihrer Nische. Identifizieren Sie Marktlücken.
          </p>
        </div>
        <div className="bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-sm shadow-xl">
           <span className="text-[10px] font-black uppercase tracking-widest">{competitorData.length - 1} Wettbewerber erkannt</span>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8">
         <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
            <h4 className="text-[14px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Direkter Score-Vergleich</h4>
         </div>
         <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={competitorData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEE" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#888' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#888' }} />
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: '0px' }}
                     itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                     labelStyle={{ color: '#888', fontSize: '9px', marginBottom: '4px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  <Bar dataKey="seo" name="SEO" fill="#D4AF37" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="security" name="Sicherheit" fill="#1A1A1A" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="performance" name="Performance" fill="#888" radius={[2, 2, 0, 0]} />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Competitor List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {competitorData.filter(c => !c.isMe).map((comp: any, idx: number) => (
           <div key={idx} className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-100 dark:bg-zinc-800 rounded-full blur-[60px] -translate-x-1/2 -translate-y-1/2 opacity-50" />
              
              <div className="relative z-10 space-y-6">
                 <div className="flex items-center justify-between">
                    <div>
                       <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-[2px]">Wettbewerber #{idx + 1}</span>
                       <h3 className="text-[24px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">{comp.name}</h3>
                    </div>
                    <a href={comp.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-zinc-100 dark:bg-zinc-800 text-[#888] hover:bg-[#D4AF37] hover:text-white transition-all rounded-sm">
                       <ExternalLink className="w-5 h-5" />
                    </a>
                 </div>

                 <div className="grid grid-cols-3 gap-4 border-y border-[#EEE] dark:border-zinc-800 py-6">
                    <div className="text-center">
                       <span className="text-[9px] font-black uppercase text-[#888] tracking-widest block mb-1">SEO</span>
                       <span className={`text-[18px] font-black ${comp.seo > (report.seo?.score || 0) ? 'text-[#27AE60]' : 'text-red-500'}`}>{comp.seo}</span>
                    </div>
                    <div className="text-center">
                       <span className="text-[9px] font-black uppercase text-[#888] tracking-widest block mb-1">Security</span>
                       <span className="text-[18px] font-black text-[#1A1A1A] dark:text-zinc-100">{comp.security}</span>
                    </div>
                    <div className="text-center">
                       <span className="text-[9px] font-black uppercase text-[#888] tracking-widest block mb-1">Perf</span>
                       <span className="text-[18px] font-black text-[#1A1A1A] dark:text-zinc-100">{comp.performance}</span>
                    </div>
                 </div>

                 <div className="space-y-4 pt-2">
                    <div className="flex items-start gap-3">
                       <Target className="w-4 h-4 text-[#D4AF37] mt-0.5" />
                       <p className="text-[12px] text-[#666] dark:text-zinc-400 font-medium leading-tight">
                          {comp.seo > (report.seo?.score || 0) 
                            ? 'Dieser Wettbewerber hat eine stärkere organische Sichtbarkeit. Analysieren Sie deren Content-Strategie.' 
                            : 'Sie liegen aktuell vor diesem Wettbewerber. Halten Sie Ihren Vorsprung durch technischen Feinschliff.'}
                       </p>
                    </div>
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100 hover:text-[#D4AF37] transition-all group">
                       Audit-Vergleich starten <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* Market Insight Section */}
      <div className="p-10 bg-[#1A1A1A] dark:bg-zinc-950 border-t-4 border-[#D4AF37] relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-5">
            <Trophy className="w-48 h-48 text-white" />
         </div>
         <div className="relative z-10 max-w-2xl">
            <h4 className="text-[12px] font-black uppercase tracking-[3px] text-[#D4AF37] mb-4">Strategic Recommendation</h4>
            <p className="text-[18px] font-bold text-white leading-tight mb-6">
               Basierend auf dem Benchmark empfehlen wir, den Fokus auf <span className="text-[#D4AF37]">Content-Tiefe</span> und <span className="text-[#D4AF37]">Page-Speed</span> zu legen, da Ihre Wettbewerber hier aktuell die Nase vorn haben.
            </p>
            <div className="flex items-center gap-4">
               <div className="flex -space-x-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-[#1A1A1A] flex items-center justify-center">
                       <Search className="w-3 h-3 text-[#D4AF37]" />
                    </div>
                  ))}
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Deep-Analysis von 8 weiteren Marktbegleitern verfügbar.</span>
            </div>
         </div>
      </div>
    </div>
  );
}

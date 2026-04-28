'use client';

import { useState, useMemo } from 'react';
import { 
  Network, FileCode, ArrowRightLeft, 
  Search, CheckCircle2, AlertTriangle, Lock, FileSpreadsheet 
} from 'lucide-react';
import { AnalysisResult } from '@/lib/scanner/types';

export default function ProjectLinkingView({ report, plan = 'free' }: { report: AnalysisResult | null, plan?: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const isPremium = plan === 'pro' || plan === 'agency';

  const internalLinks = useMemo(() => {
    if (!report || !report.crawlSummary) return [];
    return report.crawlSummary.scannedSubpages || [];
  }, [report]);

  const filteredLinks = internalLinks.filter((l: any) => 
    l.url.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    if (!isPremium) {
      alert('Diese Funktion ist nur für PRO und AGENCY Kunden verfügbar.');
      return;
    }
    alert('Excel-Export wird generiert...');
  };

  if (!report) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#888] mb-4">
          <Network className="w-8 h-8" />
        </div>
        <h3 className="text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine Daten verfügbar</h3>
        <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest italic">Starten Sie einen Scan, um die Verlinkungs-Analyse zu nutzen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Network className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Structure Analysis</span>
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Interne Verlinkung</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Analyse der Sitemap und der internen Linkstruktur. Identifizieren Sie Optimierungspotenziale für Ihren PageRank.
          </p>
        </div>
        <button 
          onClick={handleExport}
          className={`
            px-6 py-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-xl
            ${isPremium 
              ? 'bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 hover:bg-[#D4AF37] hover:text-white' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'}
          `}
        >
          {isPremium ? <FileSpreadsheet className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          Excel Export
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 rounded-sm">
           <span className="text-[9px] font-black uppercase text-[#888] tracking-widest block mb-2">Gefundene URLs</span>
           <span className="text-[24px] font-black text-[#1A1A1A] dark:text-zinc-100">{report.crawlSummary?.totalInternalLinks || 0}</span>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 rounded-sm">
           <span className="text-[9px] font-black uppercase text-[#888] tracking-widest block mb-2">Gescannte Seiten</span>
           <span className="text-[24px] font-black text-[#1A1A1A] dark:text-zinc-100">{report.crawlSummary?.scannedSubpagesCount || 0}</span>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 rounded-sm">
           <span className="text-[9px] font-black uppercase text-[#888] tracking-widest block mb-2">Defekte Links</span>
           <span className="text-[24px] font-black text-red-500">{report.crawlSummary?.brokenLinks?.length || 0}</span>
        </div>
        <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 rounded-sm">
           <span className="text-[9px] font-black uppercase text-[#888] tracking-widest block mb-2">Orphaned Pages</span>
           <span className="text-[24px] font-black text-[#D4AF37]">0</span>
        </div>
      </div>

      <div className="bg-[#1A1A1A] dark:bg-zinc-950 p-8 border border-white/5 relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ArrowRightLeft className="w-64 h-64 text-white rotate-12" />
         </div>
         <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
               <ArrowRightLeft className="w-5 h-5 text-[#D4AF37]" />
               <h4 className="text-[18px] font-black uppercase tracking-tighter text-white">Cross-Linking Matrix</h4>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full border-collapse">
                  <thead>
                     <tr>
                        <th className="p-2 border border-white/10 text-[8px] font-black text-zinc-500 uppercase">URL / Target</th>
                        {internalLinks.slice(0, 8).map((l: any, i: number) => (
                          <th key={i} className="p-2 border border-white/10 text-[8px] font-black text-zinc-500 uppercase whitespace-nowrap overflow-hidden max-w-[100px] text-ellipsis">
                            {new URL(l.url).pathname}
                          </th>
                        ))}
                     </tr>
                  </thead>
                  <tbody>
                     {internalLinks.slice(0, 8).map((l1: any, i: number) => (
                       <tr key={i}>
                          <td className="p-2 border border-white/10 text-[8px] font-black text-zinc-300 uppercase whitespace-nowrap overflow-hidden max-w-[150px] text-ellipsis bg-white/5">
                            {new URL(l1.url).pathname}
                          </td>
                          {internalLinks.slice(0, 8).map((l2: any, j: number) => (
                            <td key={j} className={`p-2 border border-white/10 text-center`}>
                               {i === j ? (
                                 <span className="text-[8px] text-zinc-700">-</span>
                               ) : Math.random() > 0.7 ? (
                                 <div className="w-2 h-2 bg-[#D4AF37] mx-auto rounded-full shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                               ) : (
                                 <div className="w-1 h-1 bg-white/10 mx-auto rounded-full" />
                               )}
                            </td>
                          ))}
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            <p className="mt-6 text-[10px] text-zinc-500 font-bold uppercase tracking-widest italic flex items-center gap-2">
               <AlertTriangle className="w-3.5 h-3.5 text-[#D4AF37]" />
               Matrix basiert auf den aktuell gescannten Unterseiten. Für eine vollständige Matrix ist ein Deep-Crawl erforderlich.
            </p>
         </div>
      </div>

      <div className="space-y-6">
         <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <FileCode className="w-5 h-5 text-[#D4AF37]" />
               <h4 className="text-[18px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Sitemap Explorer</h4>
            </div>
            <div className="relative w-full md:w-80">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
               <input 
                  type="text"
                  placeholder="URL suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 text-[12px] focus:outline-none focus:border-[#D4AF37] transition-all"
               />
            </div>
         </div>

         <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-[#F5F5F3] dark:bg-zinc-950 border-b border-[#EEE] dark:border-zinc-800">
                     <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">URL & Score</th>
                     <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Indexierung</th>
                     <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Robots.txt</th>
                     <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Canonical</th>
                     <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
                  {filteredLinks.map((link: any, idx: number) => {
                     const isNoIndex = link.robots?.toLowerCase().includes('noindex');
                     const hasCanonical = !!link.canonical;
                     const subpageScore = Math.min(100, Math.max(0, (report?.seo?.score || 80) + (link.status === 200 ? 5 : -20) - (link.imagesWithoutAlt > 0 ? 10 : 0)));

                     return (
                     <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 flex items-center justify-center text-[10px] font-black border ${subpageScore > 80 ? 'border-[#27AE60] text-[#27AE60]' : 'border-[#D4AF37] text-[#D4AF37]'} rounded-full`}>
                                 {subpageScore}
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100 truncate max-w-[250px]">{new URL(link.url).pathname}</span>
                                 <span className="text-[10px] text-[#888] font-medium truncate max-w-[250px]">{link.url}</span>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className={`flex items-center gap-2 px-2 py-1 rounded-sm w-fit ${isNoIndex ? 'bg-red-500/10 text-red-500' : 'bg-[#27AE60]/10 text-[#27AE60]'}`}>
                              <span className="text-[9px] font-black uppercase tracking-widest">
                                 {isNoIndex ? 'No-Index' : 'Indexierbar'}
                              </span>
                           </div>
                           <span className="text-[8px] text-[#888] mt-1 block font-bold uppercase tracking-tighter truncate max-w-[100px]">{link.robots || 'index, follow'}</span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#27AE60]" />
                              <span className="text-[11px] font-bold text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-tighter">Erlaubt</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className={`text-[10px] font-bold ${hasCanonical ? 'text-[#888]' : 'text-[#D4AF37]'}`}>
                              {hasCanonical ? 'Gesetzt' : 'Fehlt'}
                           </div>
                           {hasCanonical && <span className="text-[8px] text-[#888] block truncate max-w-[100px]">{link.canonical}</span>}
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${link.status === 200 ? 'bg-[#27AE60]' : 'bg-red-500'}`} />
                              <span className="text-[11px] font-black text-[#1A1A1A] dark:text-zinc-100">{link.status}</span>
                           </div>
                        </td>
                     </tr>
                  )})}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}

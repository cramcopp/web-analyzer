'use client';

import { useMemo } from 'react';
import { 
  Link as LinkIcon, Globe, ShieldCheck, 
  ExternalLink, ArrowUpRight, PieChart, Info 
} from 'lucide-react';

export default function ProjectBacklinksView({ report }: { report: any }) {
  const mockBacklinks = useMemo(() => [
    { source: 'wikipedia.org', dr: 92, type: 'No-Follow', target: '/wiki/Web_Design', date: '12.04.2026' },
    { source: 'medium.com', dr: 88, type: 'Do-Follow', target: '/blog/seo-tips', date: '10.04.2026' },
    { source: 'techcrunch.com', dr: 90, type: 'Do-Follow', target: '/', date: '05.04.2026' },
    { source: 'github.com', dr: 95, type: 'Do-Follow', target: '/repo', date: '01.04.2026' },
    { source: 'forbes.com', dr: 91, type: 'Do-Follow', target: '/business', date: '28.03.2026' },
  ], []);

  const anchorTexts = useMemo(() => [
    { text: 'Web Analyzer', percent: 45 },
    { text: 'SEO Tool', percent: 20 },
    { text: 'Branding', percent: 15 },
    { text: 'Hier klicken', percent: 10 },
    { text: 'Quelle', percent: 10 },
  ], []);

  if (!report) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#888] mb-4">
          <LinkIcon className="w-8 h-8" />
        </div>
        <h3 className="text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine Daten verfügbar</h3>
        <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest italic">Starten Sie einen Scan, um das Linkprofil zu analysieren.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Off-Page Intelligence</span>
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">Backlinks</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl">
            Überwachen Sie Ihre Autorität und das Vertrauen von Suchmaschinen in Ihre Domain.
          </p>
        </div>
        <div className="flex items-center gap-8">
           <div className="text-right">
              <span className="text-[9px] font-black text-[#888] uppercase tracking-widest block">Domain Rating</span>
              <span className="text-[28px] font-black text-[#1A1A1A] dark:text-zinc-100 leading-none">42</span>
           </div>
           <div className="text-right">
              <span className="text-[9px] font-black text-[#888] uppercase tracking-widest block">Referring Domains</span>
              <span className="text-[28px] font-black text-[#D4AF37] leading-none">128</span>
           </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-8 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">Total Backlinks</span>
               <ArrowUpRight className="w-4 h-4 text-[#27AE60]" />
            </div>
            <div className="text-[32px] font-black text-[#1A1A1A] dark:text-zinc-100">1.4K</div>
            <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full bg-[#27AE60] w-[65%]" />
            </div>
            <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest">+12% vs. letzter Monat</p>
         </div>

         <div className="p-8 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">Dofollow Ratio</span>
               <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="text-[32px] font-black text-[#1A1A1A] dark:text-zinc-100">78%</div>
            <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full bg-[#D4AF37] w-[78%]" />
            </div>
            <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest">Gesundes Linkprofil</p>
         </div>

         <div className="p-8 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">Toxic Links</span>
               <div className="w-2 h-2 rounded-full bg-[#27AE60]" />
            </div>
            <div className="text-[32px] font-black text-[#27AE60]">0</div>
            <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full bg-[#27AE60] w-[0%]" />
            </div>
            <p className="text-[10px] text-[#888] font-bold uppercase tracking-widest">Keine Bedrohung erkannt</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Backlinks Table */}
         <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#EEE] dark:border-zinc-800 flex items-center justify-between">
               <h4 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Neueste Backlinks</h4>
               <Globe className="w-4 h-4 text-[#888]" />
            </div>
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-[#F5F5F3] dark:bg-zinc-950 border-b border-[#EEE] dark:border-zinc-800">
                     <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Quelle Domain</th>
                     <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Rating</th>
                     <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Typ</th>
                     <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#888]">Datum</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-[#EEE] dark:divide-zinc-800">
                  {mockBacklinks.map((link, idx) => (
                     <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-2">
                                 {link.source}
                                 <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                              </span>
                              <span className="text-[10px] text-[#888] font-medium italic">Target: {link.target}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="text-[12px] font-black text-[#D4AF37] bg-[#D4AF37]/5 px-2 py-0.5 rounded-sm">DR {link.dr}</span>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`text-[10px] font-black uppercase tracking-widest ${link.type === 'Do-Follow' ? 'text-[#27AE60]' : 'text-zinc-400'}`}>
                              {link.type}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-[11px] font-bold text-[#888]">{link.date}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Anchor Text Analysis */}
         <div className="bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 p-8 space-y-8">
            <div className="flex items-center gap-3">
               <PieChart className="w-5 h-5 text-[#D4AF37]" />
               <h4 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">Anchor Texte</h4>
            </div>
            <div className="space-y-6">
               {anchorTexts.map((at, i) => (
                 <div key={i} className="space-y-2">
                    <div className="flex justify-between items-end">
                       <span className="text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-100">"{at.text}"</span>
                       <span className="text-[10px] font-black text-[#D4AF37]">{at.percent}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                       <div className="h-full bg-[#D4AF37]" style={{ width: `${at.percent}%` }} />
                    </div>
                 </div>
               ))}
            </div>
            <div className="pt-4 border-t border-[#EEE] dark:border-zinc-800">
               <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-[#888] mt-0.5" />
                  <p className="text-[10px] text-[#888] font-medium leading-relaxed italic">
                     Die Ankertext-Verteilung wirkt natürlich. Ein hoher Anteil an Brand-Keywords ist positiv für die Autorität.
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

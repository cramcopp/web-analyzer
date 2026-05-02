'use client';

import { memo } from 'react';
import { Search, Globe, Info, ShieldCheck, Share2, CodeXml, Activity } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import PrioritizedTasksSection from './task-section';
import { DetailedSEO } from '../types/report';
import { getCrawlLimit } from '../lib/plans';

export const CrawlerAuditModule = memo(({ crawlSummary, plan = 'free' }: { crawlSummary: any, plan?: string }) => {
  if (!crawlSummary || !crawlSummary.scannedSubpages) return null;

  const displayLimit = getCrawlLimit(plan);
  const displayedPages = crawlSummary.scannedSubpages.slice(0, displayLimit);
  const isLimited = crawlSummary.scannedSubpagesCount > displayedPages.length;

  return (
    <div className="mt-10 p-6 bg-[#F9F9F9] dark:bg-zinc-900/50 border-t-2 border-[#D4AF37] relative break-inside-avoid">
      <h4 className="text-[14px] font-black uppercase text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-3 tracking-[2px] mb-6">
        <Globe className="w-5 h-5 text-[#D4AF37]" />
        Site-Wide Audit (Crawling Result)
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedPages.map((page: any, idx: number) => (
          <div key={idx} className="bg-white dark:bg-zinc-950 p-4 border border-[#EEE] dark:border-zinc-800 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-[#D4AF37] tracking-widest truncate max-w-[150px]">
                {new URL(page.url).pathname}
              </span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${page.status === 200 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                {page.status}
              </span>
            </div>
            <h5 className="text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-100 line-clamp-1">{page.title || 'Kein Titel'}</h5>
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#888] font-bold uppercase tracking-tighter">H1 Tags</span>
                <span className={`text-[10px] font-bold ${page.h1Count === 0 || page.h1Count > 1 ? 'text-red-500' : 'text-green-600'}`}>{page.h1Count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#888] font-bold uppercase tracking-tighter">Fehlende Alts</span>
                <span className={`text-[10px] font-bold ${page.imagesWithoutAlt > 0 ? 'text-orange-500' : 'text-green-600'}`}>{page.imagesWithoutAlt}</span>
              </div>
            </div>
          </div>
        ))}

        {isLimited && (
          <div className="relative bg-white/50 dark:bg-zinc-950/50 p-4 border border-dashed border-zinc-300 dark:border-zinc-800 flex flex-col items-center justify-center text-center gap-2 overflow-hidden min-h-[120px]">
            <div className="absolute inset-0 backdrop-blur-[2px] z-0"></div>
            <div className="relative z-10 flex flex-col items-center">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37] mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">
                +{crawlSummary.scannedSubpagesCount - displayedPages.length} Seiten gefunden
              </span>
              <p className="text-[8px] text-[#888] font-bold mt-1">NUR IN PRO VERFÜGBAR</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 flex items-center justify-between gap-4 text-[10px] text-[#888] font-bold uppercase tracking-widest bg-white dark:bg-zinc-950 p-3 border border-[#EEE] dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <Info className="w-4 h-4 text-[#D4AF37]" />
          <span>Gefundene interne Links: {crawlSummary.totalInternalLinks} | Tiefen-Audit von {crawlSummary.scannedSubpagesCount} Seiten.</span>
        </div>
        {isLimited && (
          <span className="text-[#D4AF37] flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" /> EINGESCHRÄNKT
          </span>
        )}
      </div>
    </div>
  );
});

CrawlerAuditModule.displayName = 'CrawlerAuditModule';

function SeoDeepDiveModule({ detailedSeo, socialData, crawlSummary, plan = 'free' }: { detailedSeo: DetailedSEO, socialData?: any, crawlSummary?: any, plan?: string }) {
  return (
    <CollapsibleSection id="seo" title="Comprehensive SEO Analysis" icon={<Search className="w-6 h-6" />} color="#1A1A1A" badge="SEO DEEP DIVE" className="mt-8">
      {crawlSummary && (
        <CrawlerAuditModule crawlSummary={crawlSummary} plan={plan} />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[40px] mb-[40px]">
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[12px] text-[#888888] dark:text-zinc-400 tracking-wider">Keywords & Inhaltsrelevanz</span>
            <div className="flex flex-wrap gap-2 mb-4">
              {detailedSeo.keywordAnalysis.split(/[,\n.]/).filter(k => k.trim().length > 2 && k.trim().length < 40).slice(0, 10).map((kw, i) => (
                <span key={i} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-sm">
                  {kw.trim()}
                </span>
              ))}
            </div>
             <p className="text-[12px] leading-[1.6] text-[#888] font-medium italic opacity-80">{detailedSeo.keywordAnalysis}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Meta-Tags & Struktur</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.metaTagsAssessment}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Link-Profil (Intern/Extern)</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.linkStructure}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Mobile UX & Viewport</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.mobileFriendly}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px] md:col-span-2">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Lokales SEO & NAP (Name, Address, Phone)</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.localSeoNap}</p>
         </div>

         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#27AE60] dark:text-[#27AE60] tracking-wider flex items-center gap-1.5"><CodeXml className="w-3 h-3"/> Strukturelle Tiefe & HTML5</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.semanticStructure}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#F2994A] dark:text-[#F2994A] tracking-wider flex items-center gap-1.5"><Activity className="w-3 h-3"/> Call-to-Action (CTA) Check</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.ctaAnalysis}</p>
         </div>

         {detailedSeo.contentQuality && (
           <>
             <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
                <span className="text-[11px] uppercase font-bold mb-[5px] text-[#27AE60] tracking-wider">Lesbarkeit & Flesch-Score</span>
                 <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.contentQuality.readabilityAssessment}</p>
             </div>
             <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
                <span className="text-[11px] uppercase font-bold mb-[5px] text-[#EB5757] tracking-wider">Content-Duplikate & Fokus</span>
                 <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedSeo.contentQuality.duplicateContentIssues}</p>
             </div>
           </>
         )}

         {detailedSeo.technicalSeo && (
           <div className="flex flex-col gap-6 md:col-span-2 mt-4 p-4 bg-[#F5F5F3] dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800">
             <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#1A1A1A] dark:text-zinc-100 mb-2 border-b border-[#EEE] dark:border-zinc-800 pb-2">Technisches SEO Deep-Dive</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 mb-1">XML Sitemap</span>
                   <p className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 leading-relaxed font-medium">{detailedSeo.technicalSeo.sitemapStatus}</p>
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 mb-1">Robots.txt</span>
                   <p className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 leading-relaxed font-medium">{detailedSeo.technicalSeo.robotsTxtStatus}</p>
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 mb-1">Canonical Tag</span>
                   <p className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 leading-relaxed font-medium">{detailedSeo.technicalSeo.canonicalStatus}</p>
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 mb-1">Hreflang (International)</span>
                   <p className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 leading-relaxed font-medium">{detailedSeo.technicalSeo.hreflangStatus}</p>
                </div>
             </div>
           </div>
         )}
      </div>

      {socialData && (
        <div className="mt-8 pt-8 border-t border-[#EEE] dark:border-zinc-700 break-inside-avoid">
           <h4 className="text-[14px] font-bold uppercase text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-3 tracking-wide mb-8">
             <Share2 className="w-5 h-5 text-[#D4AF37]" />
             Social Media Preview (OpenGraph)
           </h4>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="bg-[#FFFFFF] dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 rounded-none overflow-hidden shadow-sm max-w-[450px]">
               {socialData.ogImage ? (
                 <div className="w-full h-[230px] relative bg-[#F5F5F3] dark:bg-zinc-900 border-b border-[#EEE] dark:border-zinc-800">
                   <img 
                     src={socialData.ogImage} 
                     alt="Social Preview" 
                     className="w-full h-full object-cover"
                     referrerPolicy="no-referrer"
                   />
                 </div>
               ) : (
                 <div className="w-full h-[230px] bg-[#F5F5F3] dark:bg-zinc-900 flex flex-col items-center justify-center border-b border-[#EEE] dark:border-zinc-800">
                   <Share2 className="w-12 h-12 text-[#DDD] dark:text-zinc-800 mb-3" />
                   <span className="text-[10px] uppercase font-bold text-[#AAA]">Kein OG-Bild gefunden</span>
                 </div>
               )}
               <div className="p-6">
                 <p className="text-[11px] text-[#888888] uppercase font-bold tracking-[1.5px] mb-2 truncate">
                   {socialData.ogType || 'WEBSITE'}
                 </p>
                 <h5 className="text-[18px] font-bold text-[#1A1A1A] dark:text-zinc-100 line-clamp-2 leading-[1.3] mb-3">
                   {socialData.ogTitle || 'Titellose Vorschau'}
                 </h5>
                 <p className="text-[14px] text-[#666] dark:text-zinc-400 line-clamp-3 leading-relaxed">
                   {socialData.ogDescription || 'Keine OpenGraph-Beschreibung für Social Media verfügbar.'}
                 </p>
               </div>
             </div>

             <div className="flex flex-col gap-6 justify-center">
               <div className="flex flex-col border-b border-[#EEE] dark:border-zinc-800 pb-3">
                 <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 tracking-wider">OpenGraph Titel</span>
                 <span className="text-[13px] font-medium text-[#1A1A1A] dark:text-zinc-100 mt-2">{socialData.ogTitle || 'Nicht definiert'}</span>
               </div>
               <div className="flex flex-col border-b border-[#EEE] dark:border-zinc-800 pb-3">
                 <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 tracking-wider">OpenGraph Beschreibung</span>
                 <span className="text-[13px] font-medium text-[#1A1A1A] dark:text-zinc-100 mt-2">{socialData.ogDescription || 'Nicht definiert'}</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] uppercase font-bold text-[#888888] dark:text-zinc-400 tracking-wider">OG Bild-URL</span>
                 <p className="text-[11px] font-medium text-[#D4AF37] mt-2 break-all bg-[#D4AF37]/5 dark:bg-[#D4AF37]/10 p-3 italic font-mono">
                   {socialData.ogImage || 'Kein Bild-Tag gefunden'}
                 </p>
               </div>
             </div>
           </div>
        </div>
      )}

      <PrioritizedTasksSection 
        tasks={detailedSeo.prioritizedTasks} 
        title="Priorisierte SEO-Maßnahmen" 
        accentColor="#1A1A1A" 
      />
    </CollapsibleSection>
  );
}

export default memo(SeoDeepDiveModule);

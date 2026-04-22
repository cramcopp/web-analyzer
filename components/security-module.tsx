'use client';

import { memo } from 'react';
import { ShieldCheck, CodeXml } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import PrioritizedTasksSection from './task-section';
import { DetailedSecurity } from '../types/report';

function SecurityDeepDiveModule({ detailedSecurity }: { detailedSecurity: DetailedSecurity }) {
  return (
    <CollapsibleSection id="security" title="Vulnerability & Security Audit" icon={<ShieldCheck className="w-6 h-6" />} color="#EB5757" badge="SEC DEEP DIVE">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px] mb-[40px]">
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">SQLi / XSS Attack Surface</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-white/90 font-medium">{detailedSecurity.sqlXssAssessment}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#EB5757] tracking-wider flex items-center gap-1.5"><ShieldCheck className="w-3 h-3"/> Strict Security Header Check (CSP/HSTS)</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-white/90 font-medium">{detailedSecurity.headerAnalysis}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Tech-Stack Identity (Information Disclosure)</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-white/90 font-medium">{detailedSecurity.softwareConfig}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#F2994A] tracking-wider flex items-center gap-1.5"><CodeXml className="w-3 h-3"/> Data Leakage & Email Scraping Risk</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-white/90 font-medium">{detailedSecurity.dataLeakageAssessment}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px] md:col-span-2">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Google Safe Browsing</span>
             <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${detailedSecurity.googleSafeBrowsingStatus?.toLowerCase().includes('sicher') ? 'bg-[#27AE60]' : 'bg-[#EB5757]'}`}></span>
                <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-white/90 font-medium">{detailedSecurity.googleSafeBrowsingStatus || 'Nicht geprüft'}</p>
             </div>
         </div>
      </div>

      <PrioritizedTasksSection 
        tasks={detailedSecurity.prioritizedTasks} 
        title="Priorisierte Sicherheits-Patches & Remediation" 
        accentColor="#EB5757" 
      />
    </CollapsibleSection>
  );
}

export default memo(SecurityDeepDiveModule);

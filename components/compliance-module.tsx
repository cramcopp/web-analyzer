'use client';

import { memo } from 'react';
import { Scale, ShieldCheck, Globe } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import PrioritizedTasksSection from './task-section';
import { DetailedCompliance } from '../types/report';

function ComplianceDeepDiveModule({ detailedCompliance, legalData }: { detailedCompliance: DetailedCompliance, legalData?: any }) {
  return (
    <CollapsibleSection id="compliance" title="Legal & Compliance Audit" icon={<Scale className="w-6 h-6" />} color="#888888" badge="LEGAL DEEP DIVE">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[30px] mb-[40px]">
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Cookie-Banner Status</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedCompliance.cookieBannerStatus}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Rechtliche Links (Impressum/Privacy)</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedCompliance.policyLinksStatus}</p>
         </div>
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">DSGVO-Gesamtbewertung</span>
             <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedCompliance.gdprAssessment}</p>
         </div>
      </div>

      {legalData && (
        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-8 break-inside-avoid">
          <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-6 border border-[#EEE] dark:border-zinc-800">
            <h4 className="text-[12px] font-bold uppercase text-[#1A1A1A] dark:text-zinc-100 mb-4 tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#27AE60]" />
              Tracking & Consent Management
            </h4>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#888888] block mb-2">Gefundene CMPs</span>
                <div className="flex flex-wrap gap-2">
                  {legalData.cmpDetected && Object.entries(legalData.cmpDetected).some(([_, v]) => v) ? (
                    Object.entries(legalData.cmpDetected).filter(([_, v]) => v).map(([k]) => (
                      <span key={k} className="text-[10px] px-2 py-1 bg-[#27AE60] text-white uppercase font-bold">
                        {k.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] px-2 py-1 bg-[#888888] text-white uppercase font-bold">Kein CMP-Skript gefunden</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#888888] block mb-2">Erkannte Tracking-Skripte</span>
                <div className="flex flex-wrap gap-2">
                  {legalData.trackingScripts && Object.entries(legalData.trackingScripts).some(([_, v]) => v) ? (
                    Object.entries(legalData.trackingScripts).filter(([_, v]) => v).map(([k]) => (
                      <span key={k} className="text-[10px] px-2 py-1 bg-[#D4AF37] text-white uppercase font-bold">
                        {k.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] p-2 bg-[#EEE] dark:bg-zinc-800 text-[#888] uppercase font-bold line-through">Kein aktives Tracking erkannt</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-6 border border-[#EEE] dark:border-zinc-800">
            <h4 className="text-[12px] font-bold uppercase text-[#1A1A1A] dark:text-zinc-100 mb-4 tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#1A1A1A] dark:text-zinc-100" />
              Sichtbarkeit & Links
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-[#EEE] dark:border-zinc-800">
                <span className="text-[11px] font-medium">Link in Footer vorhanden?</span>
                <span className={`text-[10px] font-bold uppercase ${legalData.linksInFooter ? 'text-[#27AE60]' : 'text-[#EB5757]'}`}>
                  {legalData.linksInFooter ? 'JA' : 'NEIN'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#EEE] dark:border-zinc-800">
                <span className="text-[11px] font-medium">Privacy Link prominent (Footer)?</span>
                <span className={`text-[10px] font-bold uppercase ${legalData.privacyInFooter ? 'text-[#27AE60]' : 'text-[#EB5757]'}`}>
                  {legalData.privacyInFooter ? 'JA' : 'NEIN'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[11px] font-medium">Cookie Banner aktiv?</span>
                <span className={`text-[10px] font-bold uppercase ${legalData.cookieBannerFound ? 'text-[#27AE60]' : 'text-[#EB5757]'}`}>
                  {legalData.cookieBannerFound ? 'JA' : 'NEIN'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <PrioritizedTasksSection 
        tasks={detailedCompliance.prioritizedTasks} 
        title="Priorisierte Compliance-Aufgaben" 
        accentColor="#1A1A1A" 
      />
    </CollapsibleSection>
  );
}

export default memo(ComplianceDeepDiveModule);

'use client';

import { memo } from 'react';
import { UserCheck } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import PrioritizedTasksSection from './task-section';
import { DetailedAccessibility } from '../types/report';

function AccessibilityDeepDiveModule({ detailedAccessibility, maxDomDepth }: { detailedAccessibility: DetailedAccessibility, maxDomDepth?: number }) {
  return (
    <CollapsibleSection id="accessibility" title="Accessibility & Semantics Audit" icon={<UserCheck className="w-6 h-6" />} color="#27AE60" badge="A11Y DEEP DIVE">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px] mb-[40px]">
         <div className="flex flex-col gap-6">
           <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
              <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Visual & Contrast / Alt-Texte</span>
               <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedAccessibility.visualAndContrast}</p>
           </div>
           <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
              <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Navigation, Semantics & ARIA</span>
               <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedAccessibility.navigationAndSemantics}</p>
           </div>
         </div>
         
         <div className="bg-[#F5F5F3] dark:bg-zinc-950 p-[20px] flex flex-col justify-center border border-[#EEE] dark:border-zinc-800 min-h-[200px] break-inside-avoid">
            <span className="text-[11px] uppercase font-bold mb-[15px] text-[#888888] dark:text-zinc-400 tracking-wider text-center">DOM Structure Depth</span>
            
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex items-center justify-center w-32 h-32 rounded-full border-4 shadow-sm" style={{ borderColor: maxDomDepth && maxDomDepth > 15 ? '#EB5757' : maxDomDepth && maxDomDepth > 10 ? '#F2994A' : '#27AE60' }}>
                <div className="flex flex-col items-center">
                  <span className="text-[32px] font-black leading-none" style={{ color: maxDomDepth && maxDomDepth > 15 ? '#EB5757' : maxDomDepth && maxDomDepth > 10 ? '#F2994A' : '#27AE60' }}>{maxDomDepth || 'N/A'}</span>
                  <span className="text-[10px] uppercase font-bold text-[#888888] mt-1">Levels Deep</span>
                </div>
              </div>
              
              <div className="text-center px-4 max-w-[280px]">
                {maxDomDepth && maxDomDepth > 15 ? (
                  <p className="text-[11px] text-[#EB5757] font-medium leading-relaxed">
                    <strong>Warnung:</strong> Ein sehr tiefer DOM (über 15) verschlechtert die Render-Geschwindigkeit deutlich.
                  </p>
                ) : maxDomDepth && maxDomDepth > 10 ? (
                  <p className="text-[11px] text-[#F2994A] font-medium leading-relaxed">
                    <strong>Hinweis:</strong> Die DOM-Verschachtelung ist erhöht. Eine flachere Struktur wird empfohlen.
                  </p>
                ) : (
                  <p className="text-[11px] text-[#27AE60] font-medium leading-relaxed">
                    <strong>Exzellent:</strong> Eine flache und performante DOM-Struktur.
                  </p>
                )}
              </div>
            </div>
         </div>
      </div>

      <PrioritizedTasksSection 
        tasks={detailedAccessibility.prioritizedTasks} 
        title="Priorisierte Accessibility Fixes" 
        accentColor="#27AE60" 
      />
    </CollapsibleSection>
  );
}

export default memo(AccessibilityDeepDiveModule);

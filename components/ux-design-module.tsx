'use client';

import { memo } from 'react';
import { Smartphone, MousePointer2, Layers, Star } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import PrioritizedTasksSection from './task-section';
import { DetailedUxAndDesign } from '../types/report';

function UxDesignModule({ detailedUx }: { detailedUx: DetailedUxAndDesign }) {
  if (!detailedUx) return null;

  return (
    <CollapsibleSection 
      id="ux-design" 
      title="User Experience & Visual Design" 
      icon={<Star className="w-6 h-6" />} 
      color="#1A1A1A" 
      badge="UX AUDIT" 
      className="mt-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[40px] mb-[40px]">
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider flex items-center gap-2">
              <Smartphone className="w-3 h-3 text-[#D4AF37]" /> Mobile Experience
            </span>
            <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedUx.mobileExperience}</p>
         </div>
         
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider flex items-center gap-2">
              <MousePointer2 className="w-3 h-3 text-[#D4AF37]" /> Conversion Funnels
            </span>
            <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedUx.conversionFunnels}</p>
         </div>

         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px] md:col-span-2">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider flex items-center gap-2">
              <Layers className="w-3 h-3 text-[#D4AF37]" /> Visual Hierarchy & UI Layout
            </span>
            <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedUx.visualHierarchy}</p>
         </div>
      </div>

      <PrioritizedTasksSection 
        tasks={detailedUx.prioritizedTasks} 
        title="UX/UI Optimierungen" 
        accentColor="#1A1A1A" 
      />
    </CollapsibleSection>
  );
}

export default memo(UxDesignModule);

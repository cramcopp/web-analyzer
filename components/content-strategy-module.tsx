'use client';

import { memo } from 'react';
import { BookOpen, Target, Layout, MessageSquare } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import PrioritizedTasksSection from './task-section';
import { DetailedContentStrategy } from '../types/report';

function ContentStrategyModule({ detailedContent }: { detailedContent: DetailedContentStrategy }) {
  if (!detailedContent) return null;

  return (
    <CollapsibleSection 
      id="content-strategy" 
      title="Content Strategy & Authority" 
      icon={<BookOpen className="w-6 h-6" />} 
      color="#1A1A1A" 
      badge="AUTHORITY CHECK" 
      className="mt-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[40px] mb-[40px]">
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[12px] text-[#888888] dark:text-zinc-400 tracking-wider flex items-center gap-2">
              <Target className="w-3 h-3 text-[#D4AF37]" /> Topic Clusters & Pillars
            </span>
            <div className="flex flex-wrap gap-2 mb-4">
              {detailedContent.topicClusters?.map((topic, i) => (
                <span key={i} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-sm">
                  {topic}
                </span>
              ))}
            </div>
         </div>
         
         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider flex items-center gap-2">
              <Layout className="w-3 h-3 text-[#D4AF37]" /> Heading Hierarchy
            </span>
            <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedContent.headingHierarchy}</p>
         </div>

         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#EB5757] tracking-wider flex items-center gap-2">
              <MessageSquare className="w-3 h-3" /> Keyword Cannibalization
            </span>
            <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedContent.keywordCannibalization}</p>
         </div>

         <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
            <span className="text-[11px] uppercase font-bold mb-[5px] text-[#27AE60] tracking-wider flex items-center gap-2">
              <BookOpen className="w-3 h-3" /> Readability & Tone
            </span>
            <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedContent.readabilityAndTone}</p>
         </div>
      </div>

      <PrioritizedTasksSection 
        tasks={detailedContent.prioritizedTasks} 
        title="Inhaltliche Optimierungen" 
        accentColor="#1A1A1A" 
      />
    </CollapsibleSection>
  );
}

export default memo(ContentStrategyModule);

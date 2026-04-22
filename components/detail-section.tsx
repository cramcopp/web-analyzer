'use client';

import { memo } from 'react';
import { Zap, Eye, Rocket } from 'lucide-react';
import { ReportSection } from '../types/report';

function DetailSection({ title, data, badge }: { title: string, data: ReportSection, badge: string }) {
  if (!data) return null;

  const getStatusIconColor = (score: number) => {
    if (score >= 70) return 'bg-[#27AE60]';
    if (score >= 40) return 'bg-[#F2994A]';
    return 'bg-[#EB5757]';
  };

  return (
    <section className="bg-[#FFFFFF] dark:bg-zinc-900 p-[30px] border-l border-black/5 flex flex-col break-inside-avoid">
      <div className="flex items-center justify-between mb-[20px]">
        <h3 className="text-[16px] font-black uppercase text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-3">
           <Zap className="w-5 h-5 text-[#D4AF37]" />
           {title}
        </h3>
        <span className="text-[9px] px-2 py-1 bg-[#F5F5F3] dark:bg-zinc-950 uppercase font-bold text-[#1A1A1A] dark:text-zinc-100 tracking-wider border border-[#EEE] dark:border-zinc-800">{badge}</span>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-[10px] uppercase tracking-[2px] font-black text-[#888888] dark:text-zinc-400 mb-3 pb-2 border-b border-[#EEE] dark:border-zinc-800 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            AI Insights
          </h4>
          <ul className="list-none flex flex-col">
            {(data.insights || []).map((insight, idx) => (
              <li key={idx} className="py-[12px] border-b border-[#EEE] dark:border-zinc-800 flex items-start justify-between gap-3 last:border-b-0">
                <div className="flex items-start gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${getStatusIconColor(data.score)}`}></span>
                  <span className="text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-200 leading-[1.5]">{insight}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="text-[10px] uppercase tracking-[2px] font-black text-[#888888] dark:text-zinc-400 mb-3 pb-2 border-b border-[#EEE] dark:border-zinc-800 flex items-center gap-2">
            <Rocket className="w-3.5 h-3.5" />
            Empfohlene Maßnahmen
          </h4>
          <ul className="list-none flex flex-col">
            {(data.recommendations || []).map((rec, idx) => (
              <li key={idx} className="py-[12px] border-b border-[#EEE] dark:border-zinc-800 flex items-start justify-between gap-4 last:border-b-0">
                 <div className="flex items-start gap-3">
                   <span className="text-[9px] px-[6px] py-[2px] bg-[#1A1A1A] dark:bg-zinc-800 text-[#FFFFFF] font-black shrink-0 mt-[2px] uppercase tracking-tighter">
                     STEP {idx + 1}
                   </span>
                  <span className="text-[12px] font-bold text-[#1A1A1A] dark:text-zinc-200 leading-[1.5]">{rec}</span>
                 </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default memo(DetailSection);

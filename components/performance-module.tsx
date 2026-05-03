'use client';

import { memo } from 'react';
import { Zap, Activity, Timer, Layout, MoveHorizontal, Lightbulb, BarChart3, MousePointer2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useTheme } from './theme-provider';
import { CollapsibleSection } from './collapsible-section';
import PrioritizedTasksSection from './task-section';
import { DetailedPerformance } from '../types/report';
import { SafeResponsiveContainer } from './safe-responsive-container';

const METRIC_DEFINITIONS: Record<string, string> = {
  FCP: "First Contentful Paint (FCP) misst die Zeit, bis das erste DOM-Element gerendert wird.",
  LCP: "Largest Contentful Paint (LCP) misst die Ladezeit des größten sichtbaren Elements.",
  TBT: "Total Blocking Time (TBT) zeigt, wie lange der Hauptthread blockiert ist.",
  TTFB: "Time to First Byte (TTFB) ist die Zeit vom Request bis zum ersten empfangenen Byte.",
  CLS: "Cumulative Layout Shift (CLS) misst unerwartete Layout-Verschiebungen.",
  FID: "First Input Delay (FID) misst die Reaktionszeit bei der ersten Interaktion."
};

const ResourceTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 dark:bg-black/95 backdrop-blur-md border border-[#DDD] dark:border-white/10 p-4 shadow-2xl rounded-sm">
        <div className="flex items-center gap-2 mb-2">
           <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
           <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-wider">{data.name}</p>
        </div>
        <p className="text-[18px] text-[#1A1A1A] dark:text-white font-black leading-none">{data.count} <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest ml-1">Requests</span></p>
      </div>
    );
  }
  return null;
};

const PerformanceTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const definition = METRIC_DEFINITIONS[data.metric] || "";
    const isCritical = data.value > 2500;
    const isWarning = data.value > 1500;
    
    return (
      <div className="bg-white/95 dark:bg-black/95 backdrop-blur-md border border-[#DDD] dark:border-white/10 p-4 shadow-2xl rounded-sm max-w-[240px]">
        <div className="flex items-center justify-between mb-2">
           <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-wider">{data.metric}</p>
           <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-[#EB5757]' : isWarning ? 'bg-[#F2994A]' : 'bg-[#27AE60]'}`}></span>
        </div>
        <p className="text-[20px] text-[#1A1A1A] dark:text-white font-black leading-none mb-3">
          {data.value} <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest ml-1">ms</span>
        </p>
        {definition && (
          <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5">
            <p className="text-[10px] text-[#444] dark:text-zinc-400 leading-relaxed font-medium">
              {definition}
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

function PerformanceDeepDiveModule({ detailedPerformance }: { detailedPerformance: DetailedPerformance }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <CollapsibleSection id="performance" title="Performance & Speed Audit" icon={<Zap className="w-6 h-6" />} color="#D4AF37" badge="PERF DEEP DIVE">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10 items-start">
        {/* Left Column: Core Web Vitals Cards */}
        <div className="flex flex-col gap-8">
           {detailedPerformance.coreWebVitals && (
             <div className="flex flex-col gap-6">
               <div className="flex items-center justify-between mb-2">
                 <span className="text-[11px] uppercase font-black text-[#1A1A1A] dark:text-zinc-100 tracking-[1.5px] flex items-center gap-2">
                   <Activity className="w-4 h-4 text-[#D4AF37]" />
                   Core Web Vitals Insights
                 </span>
               </div>
               <div className="grid grid-cols-1 gap-4">
                 {[
                   { id: 'fcp', label: 'First Contentful Paint', data: detailedPerformance.coreWebVitals.fcp, icon: <Timer className="w-4 h-4" /> },
                   { id: 'lcp', label: 'Largest Contentful Paint', data: detailedPerformance.coreWebVitals.lcp, icon: <Layout className="w-4 h-4" /> },
                   { id: 'cls', label: 'Cumulative Layout Shift', data: detailedPerformance.coreWebVitals.cls, icon: <MoveHorizontal className="w-4 h-4" /> },
                 ].map((vital: any) => (
                   <div 
                     key={vital.id} 
                     className="bg-[#FFFFFF] dark:bg-zinc-900/50 p-4 border border-[#EEE] dark:border-zinc-800 flex flex-col relative overflow-hidden transition-all hover:bg-black/[0.02] dark:hover:bg-white/[0.02] group cursor-help break-inside-avoid"
                   >
                     <div className={`absolute left-0 top-0 w-1.5 h-full ${vital.data?.status === 'good' ? 'bg-[#27AE60]' : vital.data?.status === 'poor' ? 'bg-[#EB5757]' : 'bg-[#F2994A]'}`} />
                     
                     <div className="flex justify-between items-center mb-3 pl-3">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-[#F5F5F3] dark:bg-zinc-800 text-[#1A1A1A] dark:text-zinc-100">
                           {vital.icon}
                         </div>
                         <div className="flex flex-col">
                           <span className="text-[12px] font-black text-[#1A1A1A] dark:text-zinc-100 uppercase tracking-widest leading-none mb-1">{vital.id}</span>
                           <span className="text-[9px] text-[#888] uppercase font-bold tracking-wider">{vital.label}</span>
                         </div>
                       </div>
                       <div className="flex flex-col items-end">
                         <span className="text-[20px] font-black tracking-tighter" style={{ color: vital.data?.status === 'good' ? '#27AE60' : vital.data?.status === 'poor' ? '#EB5757' : '#F2994A'}}>{vital.data?.value || vital.data?.numericValue}</span>
                         <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 mt-1 ${vital.data?.status === 'good' ? 'text-[#27AE60] bg-[#27AE60]/10' : vital.data?.status === 'poor' ? 'text-[#EB5757] bg-[#EB5757]/10' : 'text-[#F2994A] bg-[#F2994A]/10'}`}>
                           {vital.data?.status?.toUpperCase() || 'N/A'}
                         </span>
                       </div>
                     </div>
                     
                     <div className="pl-3 mt-1 py-3 border-t border-[#F5F5F3] dark:border-zinc-800/50">
                        <p className="text-[11px] leading-[1.5] text-[#444] dark:text-zinc-400 font-medium">
                          <span className="uppercase text-[9px] font-black tracking-widest text-[#D4AF37] mr-2 inline-flex items-center gap-1"><Lightbulb className="w-3 h-3" /> FIX:</span> 
                          {vital.data?.recommendation}
                        </p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>

        {/* Right Column: Charts */}
        <div className="bg-[#F5F5F3] dark:bg-zinc-800 p-[20px] pb-2 flex flex-col gap-[30px] shadow-sm border border-[#EEE] dark:border-zinc-700 sticky top-4 break-inside-avoid">
           {detailedPerformance.chartData?.vitals && (
             <div className="h-[200px] w-full">
               <span className="text-[10px] uppercase font-bold text-[#1A1A1A] dark:text-[#FFFFFF] mb-[15px] block tracking-wider flex items-center gap-2">
                 <BarChart3 className="w-3 h-3" />
                 Estimated Vitals (ms)
               </span>
               <SafeResponsiveContainer height={160}>
                 <BarChart data={detailedPerformance.chartData.vitals} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                   <XAxis type="number" fontSize={10} tick={{ fill: isDark ? '#A1A1AA' : '#888' }} stroke={isDark ? '#3F3F46' : '#E5E7EB'} />
                   <YAxis dataKey="metric" type="category" width={50} fontSize={10} tick={{ fill: isDark ? '#F4F4F5' : '#1A1A1A' }} stroke={isDark ? '#3F3F46' : '#E5E7EB'} />
                   <Tooltip content={<PerformanceTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                   <Bar dataKey="value" fill="#D4AF37" radius={[0, 4, 4, 0]}>
                      {detailedPerformance.chartData.vitals.map((entry: any, index: number) => (
                         <Cell key={`cell-${index}`} fill={entry.value > 2500 ? '#EB5757' : entry.value > 1500 ? '#F2994A' : '#27AE60'} />
                      ))}
                   </Bar>
                 </BarChart>
               </SafeResponsiveContainer>
             </div>
           )}

           {detailedPerformance.chartData?.resources && (
             <div className="h-[200px] w-full mt-4 border-t border-[#DDD] dark:border-white/10 pt-6">
               <span className="text-[10px] uppercase font-bold text-[#1A1A1A] dark:text-[#FFFFFF] mb-[15px] block tracking-wider flex items-center gap-2">
                 <MousePointer2 className="w-3 h-3" />
                 Resource Request Distribution
               </span>
               <SafeResponsiveContainer height={160}>
                 <BarChart data={detailedPerformance.chartData.resources} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                   <XAxis dataKey="name" fontSize={10} tick={{ fill: isDark ? '#A1A1AA' : '#1A1A1A' }} stroke={isDark ? '#3F3F46' : '#E5E7EB'} />
                   <YAxis fontSize={10} tick={{ fill: isDark ? '#A1A1AA' : '#888' }} stroke={isDark ? '#3F3F46' : '#E5E7EB'} />
                   <Tooltip content={<ResourceTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                   <Bar dataKey="count" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </SafeResponsiveContainer>
             </div>
           )}
        </div>
      </div>

      {/* Assessment Blocks Below the Grid (Full Width) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
              <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">General Performance Assessment</span>
              <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedPerformance.coreVitalsAssessment}</p>
          </div>
          <div className="flex flex-col border-t border-[#EEE] dark:border-zinc-800 pt-[15px]">
              <span className="text-[11px] uppercase font-bold mb-[5px] text-[#888888] dark:text-zinc-400 tracking-wider">Resource Optimization</span>
              <p className="text-[13px] leading-[1.6] text-[#1A1A1A] dark:text-zinc-100 font-medium">{detailedPerformance.resourceOptimization}</p>
          </div>
      </div>

      <PrioritizedTasksSection 
        tasks={detailedPerformance.prioritizedTasks} 
        title="Priorisierte Speed-Optimierungen" 
        accentColor="#D4AF37" 
      />
    </CollapsibleSection>
  );
}

export default memo(PerformanceDeepDiveModule);

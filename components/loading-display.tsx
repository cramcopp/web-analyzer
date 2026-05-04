'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { normalizePlan, type PlanType } from '../lib/plans';

const DIAGNOSTIC_TERMS = [
  "FETCHING_HEADERS_SSL", "DEEP_CRAWL_IN_PROGRESS", "CSS_PARSING_METRICS", "DOM_DEPTH_CALCULATION",
  "SCHEMA_LD_JSON_AUDIT", "WAP_INTEL_ORCHESTRATION", "SECURITY_HEADER_CHECK", "SSL_CERT_VALIDATION",
  "GSC_DATA_AGGREGATION", "PSI_API_LATENCY_CHECK", "RESPONSIVE_VIEWPORT_AUDIT", "OG_SOCIAL_META_SCRAPE"
];

const MODEL_NAMES: Record<PlanType, string> = {
  free: "WAP Standard v1",
  pro: "WAP Advanced v2",
  agency: "WAP Agency v3",
  business: "WAP Business v4",
};

function FloatingScannerProgress({ progress }: { progress: number }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1.5 bg-transparent pointer-events-none">
       <div 
         className="h-full bg-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.8)] transition-all duration-700 ease-out" 
         style={{ width: `${progress}%` }}
       />
    </div>
  );
}

function LoadingDisplay({ plan = 'free' }: { plan?: string }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);

  const scanPlan = normalizePlan(plan);
  const modelName = MODEL_NAMES[scanPlan];

  const steps = useMemo(() => [
    `Initialisiere ${modelName} Intelligence...`,
    "Analysiere mit Gemini-Power...",
    "Crawle Webseiteninhalte...",
    "Analysiere Unterseiten...",
    "Generiere SEO-Report...",
    "Führe Security-Audit durch...",
    "Analysiere Performance-Metriken...",
    "Prüfe Barrierefreiheit...",
    "Kombiniere KI-Erkenntnisse..."
  ], [modelName]);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) return prev;
        const increment = prev < 50 ? Math.random() * 8 : Math.random() * 2;
        return Math.min(prev + increment, 98);
      });
    }, 1000);

    const stepInterval = setInterval(() => {
      setStepIndex(prev => Math.min(prev + 1, steps.length - 1));
    }, 5500);

    const termInterval = setInterval(() => {
      setTerminalLines(prev => {
        const next = [...prev, DIAGNOSTIC_TERMS[Math.floor(Math.random() * DIAGNOSTIC_TERMS.length)]];
        return next.slice(-4);
      });
    }, 1200);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearInterval(termInterval);
    };
  }, [steps.length]);

  return (
    <>
      <FloatingScannerProgress progress={progress} />
      <div className="py-24 flex flex-col items-center justify-center text-[#1A1A1A] dark:text-zinc-100 gap-8">
        <div className="relative group">
          <div className="absolute inset-0 bg-[#D4AF37]/20 blur-[60px] rounded-full animate-pulse" />
          <div className="relative flex flex-col items-center">
            <span className="text-[82px] font-black tracking-tighter leading-none text-[#1A1A1A] dark:text-white flex items-center justify-center">
              {Math.round(progress)}
              <span className="text-[28px] font-bold opacity-20 ml-2">%</span>
            </span>
            <div className="mt-4 flex gap-1.5">
               {[...Array(5)].map((_, i) => (
                 <div 
                   key={i} 
                   className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${Math.round(progress/20) > i ? 'bg-[#D4AF37]' : 'bg-[#DDD] dark:bg-zinc-800'}`} 
                 />
               ))}
            </div>
          </div>
        </div>
        
        <div className="w-full max-w-[450px] flex flex-col items-center">
          <p className="text-[20px] font-black uppercase tracking-tight text-[#1A1A1A] dark:text-zinc-100 mb-2 h-[28px] text-center">
            {steps[stepIndex]}
          </p>
          
          <div className="w-full bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5 p-4 mb-8 font-mono overflow-hidden">
             {terminalLines.map((line, idx) => (
               <div key={idx} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                 <span className="text-[9px] text-[#D4AF37] font-black">[DIAG]</span>
                 <span className="text-[10px] text-[#888] font-bold uppercase tracking-widest">{line}</span>
                 <div className="ml-auto w-1 h-1 bg-[#D4AF37] animate-pulse" />
               </div>
             ))}
             {terminalLines.length === 0 && <div className="h-[60px] flex items-center justify-center text-[10px] text-[#555] uppercase font-bold tracking-widest">Warte auf Daten...</div>}
          </div>
          
          <div className="w-full h-1.5 bg-[#E5E5E5] dark:bg-zinc-800/50 rounded-full overflow-hidden mb-6 relative">
            <div 
              className="h-full bg-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.6)] transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-[11px] uppercase text-[#888888] dark:text-zinc-500 tracking-[3px] font-black">
              System Scan <span className="animate-pulse">Active</span>
            </p>
            <div className="h-0.5 w-8 bg-[#D4AF37] animate-bounce" />
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(LoadingDisplay);

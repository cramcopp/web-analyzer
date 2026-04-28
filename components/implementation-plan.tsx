'use client';

import { memo } from 'react';
import { Rocket, CheckCircle2, ClipboardList, Copy } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const PhaseCard = ({ phase, data }: { phase: string, data: any }) => (
  <motion.div 
    variants={itemVariants}
    className="bg-white dark:bg-zinc-900 border border-[#E5E5E5] dark:border-zinc-800 p-6 flex flex-col gap-4 relative overflow-hidden group transition-all hover:shadow-xl hover:border-[#D4AF37]"
  >
    <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37]/5 -rotate-12 translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform"></div>
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-black uppercase tracking-[2px] text-[#D4AF37]">{phase}</span>
      <div className="h-px flex-1 bg-[#EEE] dark:bg-zinc-800"></div>
    </div>
    <h5 className="text-[18px] font-black uppercase text-[#1A1A1A] dark:text-zinc-100 tracking-tighter leading-none">{data.title}</h5>
    <ul className="flex flex-col gap-2 mt-2">
      {data.tasks.map((task: string, idx: number) => (
        <li key={idx} className="flex items-start gap-3">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#27AE60] mt-0.5 shrink-0" />
          <span className="text-[12px] font-medium text-[#666] dark:text-zinc-400 leading-tight">{task}</span>
        </li>
      ))}
    </ul>
  </motion.div>
);

function ImplementationPlanModule({ plan }: { plan?: any }) {
  if (!plan) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(plan.developerPrompt);
    alert('Developer-Briefing in die Zwischenablage kopiert!');
  };

  return (
    <motion.div 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
      id="implementation-plan" 
      className="mt-20 scroll-mt-24 break-inside-avoid"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-4 mb-10">
         <Rocket className="w-8 h-8 text-[#D4AF37]" />
         <h3 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">
           Strategischer Phasenplan
         </h3>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <PhaseCard phase="Phase 1" data={plan.phase1} />
        <PhaseCard phase="Phase 2" data={plan.phase2} />
        <PhaseCard phase="Phase 3" data={plan.phase3} />
      </div>

      <motion.div 
        variants={itemVariants}
        className="bg-[#1A1A1A] dark:bg-zinc-950 p-10 border-t-4 border-[#D4AF37] shadow-2xl relative rounded-b-lg"
      >
        <div className="absolute top-4 right-4">
          <ClipboardList className="w-10 h-10 text-white/5" />
        </div>
        <div className="max-w-[800px]">
          <h4 className="text-[12px] font-black uppercase tracking-[3px] text-[#D4AF37] mb-4">Developer Handover Briefing</h4>
          <p className="text-[18px] font-bold text-white mb-8 leading-tight">Bereit für die Umsetzung? Kopiere diesen Prompt für dein Entwickler-Team.</p>
          
          <div className="bg-white/5 border border-white/10 p-6 rounded-sm relative group mb-8">
            <pre className="text-[13px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
              {plan.developerPrompt}
            </pre>
            <button 
              onClick={handleCopy}
              className="absolute top-4 right-4 p-2 bg-[#D4AF37] text-white rounded-sm hover:scale-110 transition-transform shadow-lg"
              title="Kopieren"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">
            Hinweis: Dieser Prompt enthält alle kritischen Findings für eine strukturierte Optimierung.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default memo(ImplementationPlanModule);

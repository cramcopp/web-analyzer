'use client';

import { memo, useMemo } from 'react';
import { 
  Sparkles, ShieldAlert, AlertCircle, CheckCircle, 
  Copy, Layout, Terminal, Globe, Shield 
} from 'lucide-react';
import { AnalysisResult, PrioritizedTask } from '@/lib/scanner/types';

interface Task extends PrioritizedTask {
  category: string;
}

export default function ProjectAiActionPlanView({ report }: { report: AnalysisResult | null }) {
  const tasks = useMemo(() => {
    if (!report) return [];
    
    const allTasks: Task[] = [];

    // Extract from SEO
    if (report.seo?.detailedSeo?.prioritizedTasks) {
      report.seo.detailedSeo.prioritizedTasks.forEach((t: any) => 
        allTasks.push({ ...t, category: 'SEO' })
      );
    }

    // Extract from Security
    if (report.security?.detailedSecurity?.prioritizedTasks) {
      report.security.detailedSecurity.prioritizedTasks.forEach((t: any) => 
        allTasks.push({ ...t, category: 'Sicherheit' })
      );
    }

    // Extract from Performance
    if (report.performance?.detailedPerformance?.prioritizedTasks) {
      report.performance.detailedPerformance.prioritizedTasks.forEach((t: any) => 
        allTasks.push({ ...t, category: 'Performance' })
      );
    }

    // Extract from Accessibility
    if (report.accessibility?.detailedAccessibility?.prioritizedTasks) {
      report.accessibility.detailedAccessibility.prioritizedTasks.forEach((t: any) => 
        allTasks.push({ ...t, category: 'Barrierefreiheit' })
      );
    }

    // Extract from Compliance
    if (report.compliance?.detailedCompliance?.prioritizedTasks) {
      report.compliance.detailedCompliance.prioritizedTasks.forEach((t: any) => 
        allTasks.push({ ...t, category: 'Compliance' })
      );
    }

    // Sort by priority (CRITICAL > IMPORTANT > PERFECTION)
    const priorityMap: Record<string, number> = { 'CRITICAL': 0, 'IMPORTANT': 1, 'PERFECTION': 2 };
    return allTasks.sort((a, b) => (priorityMap[a.priority] ?? 3) - (priorityMap[b.priority] ?? 3));
  }, [report]);

  const handleCopyTask = (task: Task) => {
    const text = `[AUDIT TASK - ${task.category}]\nPriorität: ${task.priority}\n\nAufgabe: ${task.task}\n\nBitte prüfen Sie die Umsetzung gemäß Industriestandard.`;
    navigator.clipboard.writeText(text);
    alert('Task-Briefing kopiert!');
  };

  if (!report) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#888] mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-[20px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">Keine Daten verfügbar</h3>
        <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest italic">Starten Sie einen Scan, um KI-Vorschläge zu generieren.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#EEE] dark:border-zinc-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">AI Recommendation Engine</span>
          </div>
          <h2 className="text-[32px] md:text-[42px] font-black uppercase tracking-tighter leading-none text-[#1A1A1A] dark:text-zinc-100">KI-Aktionsplan</h2>
          <p className="text-[12px] text-[#888] font-bold mt-2 uppercase tracking-widest max-w-xl leading-relaxed">
            Strukturierte Aufgabenliste für Ihre Entwickler. Wir sagen Ihnen <span className="text-[#1A1A1A] dark:text-zinc-100">WAS</span> zu tun ist, um die Seite auf 100% zu bringen.
          </p>
        </div>
        <div className="bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-sm shadow-xl">
           <span className="text-[10px] font-black uppercase tracking-widest">{tasks.length} Aufgaben</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tasks.map((task, idx) => {
          const isCritical = task.priority === 'CRITICAL';
          const isImportant = task.priority === 'IMPORTANT';
          
          return (
            <div 
              key={idx} 
              className={`
                relative bg-white dark:bg-zinc-900 border p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all
                ${isCritical ? 'border-red-500/20 bg-red-500/[0.02]' : 'border-[#EEE] dark:border-zinc-800'}
                hover:border-[#D4AF37] group
              `}
            >
              <div className="flex items-start gap-6">
                <div className={`
                  w-12 h-12 shrink-0 flex items-center justify-center rounded-sm
                  ${isCritical ? 'bg-red-500 text-white' : isImportant ? 'bg-[#D4AF37] text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}
                `}>
                  {isCritical ? <ShieldAlert className="w-6 h-6" /> : isImportant ? <AlertCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isCritical ? 'bg-red-500/10 text-red-500' : isImportant ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                      {task.priority}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      • {task.category}
                    </span>
                  </div>
                  <p className="text-[15px] font-bold text-[#1A1A1A] dark:text-zinc-100 leading-snug max-w-2xl">
                    {task.task}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => handleCopyTask(task)}
                className="flex items-center gap-2 px-4 py-3 bg-[#F5F5F3] dark:bg-zinc-950 border border-[#EEE] dark:border-zinc-800 text-[9px] font-black uppercase tracking-widest hover:bg-[#1A1A1A] dark:hover:bg-white hover:text-white dark:hover:text-zinc-900 transition-all shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                Task kopieren
              </button>
            </div>
          );
        })}
      </div>

      {tasks.length > 0 && (
        <div className="mt-12 p-8 bg-[#1A1A1A] dark:bg-zinc-950 border border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-[60px]" />
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <Terminal className="w-10 h-10 text-[#D4AF37]" />
                 <div>
                    <h4 className="text-[18px] font-black uppercase tracking-tighter text-white">Full Developer Handover</h4>
                    <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">Kopieren Sie alle Aufgaben als ein kompaktes Briefing.</p>
                 </div>
              </div>
              <button 
                onClick={() => {
                  const fullText = tasks.map(t => `[${t.priority}] ${t.category}: ${t.task}`).join('\n');
                  navigator.clipboard.writeText(`DEVELOPER HANDOVER BRIEFING\n\n${fullText}`);
                  alert('Komplettes Briefing kopiert!');
                }}
                className="px-8 py-4 bg-[#D4AF37] text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-[#1A1A1A] transition-all shadow-2xl shadow-[#D4AF37]/20"
              >
                Gesamtes Briefing kopieren
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

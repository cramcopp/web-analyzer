import { useState, memo } from 'react';
import { ListChecks, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { PrioritizedTask } from '../types/report';

function PrioritizedTasksSection({ tasks, title, accentColor }: { tasks: PrioritizedTask[], title: string, accentColor: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!tasks || tasks.length === 0) return null;

  const getPriorityScore = (prio: string) => {
    const p = prio.toLowerCase();
    if (p.includes('critical') || p.includes('high') || p.includes('hoch') || p.includes('kritisch')) return 3;
    if (p.includes('important') || p.includes('medium') || p.includes('mittel')) return 2;
    return 1;
  };

  const getPriorityColor = (prio: string) => {
    const p = prio.toLowerCase();
    if (p.includes('critical') || p.includes('high') || p.includes('hoch') || p.includes('kritisch')) return 'bg-red-500/10 text-red-600 border-red-500/20';
    if (p.includes('important') || p.includes('medium') || p.includes('mittel')) return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  };

  const getPriorityBadgeName = (prio: string) => {
    const p = prio.toLowerCase();
    if (p.includes('critical') || p.includes('high') || p.includes('hoch') || p.includes('kritisch')) return '🚨 KRITISCH';
    if (p.includes('important') || p.includes('medium') || p.includes('mittel')) return '⚠️ WICHTIG';
    return '✨ OPTIMAL';
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    return getPriorityScore(b.priority) - getPriorityScore(a.priority);
  });

  const displayedTasks = isExpanded ? sortedTasks : sortedTasks.slice(0, 3);
  const hasMore = sortedTasks.length > 3;

  return (
    <div className="border-t border-[#1A1A1A] dark:border-zinc-700 pt-[25px] print:border-t-0">
      <div className="flex items-center justify-between gap-4 mb-[20px]">
        <h4 className="text-[14px] font-black uppercase text-[#1A1A1A] dark:text-zinc-100 tracking-wider flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-[#D4AF37]" />
          {title}
        </h4>
        {hasMore && (
           <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest print:hidden">{sortedTasks.length} Aufgaben total</span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {displayedTasks.map((task, i) => (
          <div key={i} className="flex flex-col gap-2 p-4 bg-[#F9F9F9] dark:bg-zinc-900 border-l-[4px] transition-all break-inside-avoid" style={{ borderLeftColor: accentColor }}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 pt-0.5">
                <span className={`text-[9px] font-black uppercase tracking-[0.5px] px-[8px] py-[3px] rounded-sm border ${getPriorityColor(task.priority)} flex items-center justify-center`}>
                  {getPriorityBadgeName(task.priority || 'PERFECTION')}
                </span>
              </div>
              <div className="flex flex-col gap-1 w-full">
                <span className="text-[12px] text-[#1A1A1A] dark:text-zinc-100 font-bold leading-[1.4]">{task.task}</span>
                {task.remediation && (
                  <div className="mt-2 bg-[#FFFFFF] dark:bg-zinc-950/50 p-3 border border-[#EEE] dark:border-zinc-800/80 w-full relative">
                    <div className="absolute top-0 left-0 w-0.5 h-full bg-[#D4AF37] opacity-60"></div>
                    <span className="text-[9px] uppercase font-black text-[#D4AF37] mb-1 block tracking-widest flex items-center gap-1.5"><Zap className="w-3 h-3"/> AI Strategie</span>
                    <p className="text-[11px] text-[#444] dark:text-zinc-400 font-medium leading-relaxed italic">{task.remediation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 w-full py-3 bg-[#F5F5F3] dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest text-[#888] hover:text-[#1A1A1A] dark:hover:text-zinc-100 transition-colors border-dashed border border-[#E5E5E5] dark:border-zinc-700 flex items-center justify-center gap-2 print:hidden"
        >
          {isExpanded ? (
            <>Weniger anzeigen <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Alle {sortedTasks.length} Aufgaben anzeigen <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
    </div>
  );
}

export default memo(PrioritizedTasksSection);

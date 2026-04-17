import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CollapsibleSectionProps {
  id: string;
  title: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  badge?: string;
}

export function CollapsibleSection({ id, title, icon, color, children, defaultExpanded = true, className = '', badge }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <section id={id} className={`bg-[#FFFFFF] dark:bg-zinc-900 border-l-[5px] flex flex-col shadow-sm transition-all ${className}`} style={{ borderLeftColor: color }}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-[40px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div style={{ color }}>{icon}</div>
          <h3 className="text-[18px] font-bold uppercase text-[#1A1A1A] dark:text-zinc-100 flex items-center gap-3">
            {title}
            {badge && (
               <span style={{ backgroundColor: color }} className="text-[9px] px-2 py-1 text-[#FFFFFF] uppercase font-bold tracking-wider ml-4 rounded-sm">
                 {badge}
               </span>
            )}
          </h3>
        </div>
        <div className="text-[#888] dark:text-zinc-400">
          {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-[40px] pb-[40px]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

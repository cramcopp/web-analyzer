'use client';

import { memo, useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

function ScoreCard({ title, score, desc, icon }: { title: string, score: number, desc: string, icon: React.ReactNode }) {
  const [displayScore, setDisplayScore] = useState(0);
  
  const spring = useSpring(0, { stiffness: 40, damping: 20 });
  const count = useTransform(spring, (value) => Math.round(value));

  useEffect(() => {
    spring.set(score);
  }, [score, spring]);

  useEffect(() => {
    return count.onChange((v) => setDisplayScore(v));
  }, [count]);

  const getColor = (s: number) => {
    if (s >= 70) return 'text-[#27AE60]';
    if (s >= 40) return 'text-[#F2994A]';
    return 'text-[#EB5757]';
  };

  const getBg = (s: number) => {
    if (s >= 70) return 'bg-[#27AE60]/5 border-[#27AE60]/20';
    if (s >= 40) return 'bg-[#F2994A]/5 border-[#F2994A]/20';
    return 'bg-[#EB5757]/5 border-[#EB5757]/20';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`p-6 border border-[#E5E5E5] dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-4 relative overflow-hidden group ${getBg(score)}`}
    >
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] font-black uppercase tracking-[2px] text-[#888]">{title}</span>
        <div className="p-2 bg-black/5 dark:bg-white/5 rounded-sm">
           {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-2 relative z-10">
        <motion.span className={`text-[48px] font-black tracking-tighter leading-none ${getColor(score)}`}>
          {displayScore}
        </motion.span>
        <span className="text-[14px] font-bold text-[#AAA]">/100</span>
      </div>

      <div className="relative z-10">
        <p className="text-[11px] font-bold text-[#888] uppercase tracking-wider">{desc}</p>
      </div>

      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1, delay: 0.5, ease: "circOut" }}
        className={`absolute bottom-0 left-0 h-1 ${getColor(score).replace('text-', 'bg-')}`}
      />
    </motion.div>
  );
}

export default memo(ScoreCard);

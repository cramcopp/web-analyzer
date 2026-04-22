'use client';

import { memo } from 'react';
import { LayoutDashboard, Search, Activity, ShieldCheck, Zap, UserCheck, Scale } from 'lucide-react';

function QuickNav() {
  const sections = [
    { id: 'summary', name: 'Zusammenfassung', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'seo', name: 'SEO', icon: <Search className="w-4 h-4" /> },
    { id: 'gsc', name: 'Search Console', icon: <Activity className="w-4 h-4" /> },
    { id: 'security', name: 'Sicherheit', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'performance', name: 'Performance', icon: <Zap className="w-4 h-4" /> },
    { id: 'accessibility', name: 'Barrierefreiheit', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'compliance', name: 'Recht/DSGVO', icon: <Scale className="w-4 h-4" /> },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#F5F5F3]/80 dark:bg-zinc-950/80 backdrop-blur-md border-b-[1px] border-black/5 dark:border-white/5 py-4 mb-8 -mx-10 px-10 print:hidden">
      <div className="flex items-center gap-8 overflow-x-auto no-scrollbar scroll-smooth">
        <span className="text-[10px] uppercase font-black text-[#D4AF37] whitespace-nowrap tracking-widest">Reports</span>
        <div className="flex items-center gap-6">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 text-[11px] uppercase font-bold text-[#888888] hover:text-[#1A1A1A] dark:hover:text-zinc-100 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              <span className="opacity-50">{s.icon}</span>
              {s.name}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default memo(QuickNav);

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function AgencyTabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
        active
          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] dark:bg-white dark:text-zinc-900 dark:border-white'
          : 'bg-white dark:bg-zinc-900 text-[#888] border-[#EEE] dark:border-zinc-800 hover:text-[#D4AF37]'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

export function AgencyStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-5 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
      <span className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">{label}</span>
      <span className="text-[24px] font-black text-[#1A1A1A] dark:text-zinc-100">{value}</span>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-2">{children}</label>;
}

export function EmptyPanel({ children }: { children: string }) {
  return <div className="p-8 text-center text-[11px] text-[#888] font-bold uppercase tracking-widest">{children}</div>;
}

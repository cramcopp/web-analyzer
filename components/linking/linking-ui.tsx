import type { LucideIcon } from 'lucide-react';
import type { LinkOpportunity } from '@/lib/internal-linking';

export function StatCard({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'gold' | 'red' | 'green' }) {
  const color = tone === 'gold' ? 'text-[#D4AF37]' : tone === 'red' ? 'text-red-500' : tone === 'green' ? 'text-[#27AE60]' : 'text-[#1A1A1A] dark:text-zinc-100';
  return (
    <div className="p-6 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800 rounded-sm">
      <span className="text-[9px] font-black uppercase text-[#888] tracking-widest block mb-2">{label}</span>
      <span className={`text-[24px] font-black ${color}`}>{value}</span>
    </div>
  );
}

export function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
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

export function PriorityBadge({ priority, confidence }: { priority?: LinkOpportunity['priority']; confidence?: number }) {
  const label = priority || 'info';
  const tone =
    priority === 'high'
      ? 'bg-red-500/10 text-red-500'
      : priority === 'medium'
        ? 'bg-[#D4AF37]/10 text-[#D4AF37]'
        : 'bg-zinc-500/10 text-[#888]';
  return (
    <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest ${tone}`}>
      {label}{typeof confidence === 'number' ? ` | ${Math.round(confidence * 100)}%` : ''}
    </span>
  );
}

export function UrlLabel({ url, strong = false }: { url: string; strong?: boolean }) {
  let path = url;
  try {
    path = new URL(url).pathname || '/';
  } catch {
    // Keep the raw value for malformed URLs from legacy reports.
  }

  return (
    <div className="flex flex-col min-w-0">
      <span className={`${strong ? 'text-[#1A1A1A] dark:text-zinc-100' : 'text-[#888]'} text-[12px] font-bold truncate`}>{path}</span>
      <span className="text-[9px] text-[#888] font-medium truncate">{url}</span>
    </div>
  );
}

export function EmptyState({ children }: { children: string }) {
  return (
    <div className="p-8 text-center text-[11px] text-[#888] font-bold uppercase tracking-widest">
      {children}
    </div>
  );
}

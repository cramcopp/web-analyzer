import {
  AlertCircle,
  BadgeCheck,
  Bot,
  Database,
  FlaskConical,
  PlugZap,
  TestTube2,
} from 'lucide-react';
import type { DataSourceType } from '@/types/data-source';

type DataSourceBadgeProps = {
  type: DataSourceType;
  label?: string;
  provider?: string;
  className?: string;
};

function getBadgeMeta(type: DataSourceType) {
  switch (type) {
    case 'real':
      return {
        label: 'Echte Audit-Daten',
        className: 'bg-[#27AE60]/10 text-[#27AE60] border-[#27AE60]/20',
        icon: BadgeCheck,
      };
    case 'gsc':
      return {
        label: 'Google Search Console',
        className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        icon: Database,
      };
    case 'provider':
      return {
        label: 'Externer Provider',
        className: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
        icon: PlugZap,
      };
    case 'heuristic':
      return {
        label: 'Heuristik',
        className: 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20',
        icon: FlaskConical,
      };
    case 'ai_inferred':
      return {
        label: 'KI-abgeleitet',
        className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
        icon: Bot,
      };
    case 'demo':
      return {
        label: 'Demo-Daten',
        className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        icon: TestTube2,
      };
    case 'unavailable':
      return {
        label: 'Nicht verfuegbar',
        className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
        icon: AlertCircle,
      };
    default:
      return {
        label: 'Quelle unbekannt',
        className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
        icon: AlertCircle,
      };
  }
}

export default function DataSourceBadge({ type, label, provider, className = '' }: DataSourceBadgeProps) {
  const meta = getBadgeMeta(type);
  const Icon = meta.icon;
  const displayLabel = label || provider || meta.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${meta.className} ${className}`}
      title={provider ? `${meta.label}: ${provider}` : meta.label}
    >
      <Icon className="h-3 w-3" />
      {displayLabel}
    </span>
  );
}

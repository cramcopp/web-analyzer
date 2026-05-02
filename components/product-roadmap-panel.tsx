import {
  BadgeCheck,
  Clock3,
  PauseCircle,
  PlugZap,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import DataSourceBadge from './data-source-badge';
import {
  NOT_NOW_FEATURES,
  PRODUCT_POSITIONING,
  getRoadmapByPillar,
  type ProductPillar,
  type RoadmapFeature,
  type RoadmapStatus,
} from '@/lib/features';

const PILLARS: Array<{ id: ProductPillar; label: string; subtitle: string }> = [
  { id: 'semrush', label: 'Semrush-Datenlayer', subtitle: 'SEO, Keywords, Rankings, Backlinks, Wettbewerber, AI Visibility' },
  { id: 'seobility', label: 'Seobility-Betrieb', subtitle: 'Monitoring, Alerts, Reports, White Label, KMU-Fokus' },
  { id: 'bertlinker', label: 'BERTlinker-Verlinkung', subtitle: 'LinkGraph, Topic Hubs, Linkjobs, Export' },
];

function statusLabel(status: RoadmapStatus) {
  switch (status) {
    case 'active':
      return 'aktiv';
    case 'foundation':
      return 'grundlage';
    case 'provider_required':
      return 'provider noetig';
    case 'planned':
      return 'geplant';
    case 'later':
      return 'spaeter';
    case 'not_now':
      return 'nicht jetzt';
    default:
      return 'offen';
  }
}

function statusClass(status: RoadmapStatus) {
  switch (status) {
    case 'active':
      return 'bg-[#27AE60]/10 text-[#27AE60] border-[#27AE60]/20';
    case 'foundation':
      return 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20';
    case 'provider_required':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'planned':
      return 'bg-violet-500/10 text-violet-600 border-violet-500/20';
    case 'later':
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    case 'not_now':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
  }
}

function StatusBadge({ status }: { status: RoadmapStatus }) {
  const Icon = status === 'active'
    ? BadgeCheck
    : status === 'provider_required'
      ? PlugZap
      : status === 'not_now'
        ? PauseCircle
        : Clock3;

  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${statusClass(status)}`}>
      <Icon className="h-3 w-3" />
      {statusLabel(status)}
    </span>
  );
}

function FeatureRow({ feature }: { feature: RoadmapFeature }) {
  return (
    <article className="p-4 border border-[#EEE] dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <StatusBadge status={feature.status} />
        <DataSourceBadge type={feature.dataSource} label={feature.providerRequired ? 'Providerpflichtig' : undefined} />
      </div>
      <h4 className="text-[12px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">{feature.label}</h4>
      <p className="mt-2 text-[10px] text-[#888] font-bold leading-relaxed">{feature.note}</p>
      {feature.route && (
        <p className="mt-3 text-[9px] text-[#D4AF37] font-black uppercase tracking-widest">Route: {feature.route}</p>
      )}
    </article>
  );
}

export default function ProductRoadmapPanel() {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-[10px] font-black uppercase tracking-[3px] text-[#D4AF37]">Produktstrategie</span>
        </div>
        <h3 className="text-[26px] md:text-[34px] font-black uppercase tracking-tighter text-[#1A1A1A] dark:text-zinc-100">
          {PRODUCT_POSITIONING.decision}
        </h3>
        <p className="text-[12px] text-[#888] font-bold uppercase tracking-widest leading-relaxed max-w-3xl">
          {PRODUCT_POSITIONING.market}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PRODUCT_POSITIONING.pillars.map((pillar) => (
          <div key={pillar} className="p-5 bg-white dark:bg-zinc-900 border border-[#EEE] dark:border-zinc-800">
            <Sparkles className="w-4 h-4 text-[#D4AF37] mb-4" />
            <p className="text-[11px] text-[#1A1A1A] dark:text-zinc-100 font-black uppercase tracking-widest leading-relaxed">{pillar}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {PILLARS.map((pillar) => {
          const features = getRoadmapByPillar(pillar.id);
          return (
            <div key={pillar.id} className="space-y-3">
              <div className="pb-3 border-b border-[#EEE] dark:border-zinc-800">
                <h4 className="text-[13px] font-black uppercase tracking-widest text-[#1A1A1A] dark:text-zinc-100">{pillar.label}</h4>
                <p className="mt-1 text-[10px] text-[#888] font-bold uppercase tracking-widest leading-relaxed">{pillar.subtitle}</p>
              </div>
              <div className="space-y-3">
                {features.map((feature) => (
                  <FeatureRow key={feature.key} feature={feature} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-5 bg-[#1A1A1A] dark:bg-zinc-950 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-4 h-4 text-[#D4AF37]" />
          <h4 className="text-[13px] font-black uppercase tracking-widest text-white">Nicht jetzt bauen</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {NOT_NOW_FEATURES.map((feature) => (
            <div key={feature.key} className="p-4 border border-white/10 bg-white/5">
              <StatusBadge status="not_now" />
              <h5 className="mt-3 text-[11px] font-black uppercase tracking-widest text-white">{feature.label}</h5>
              <p className="mt-2 text-[10px] text-zinc-500 font-bold leading-relaxed">{feature.reason}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 bg-[#D4AF37]/5 border border-[#D4AF37]/20">
        <h4 className="text-[12px] font-black uppercase tracking-widest text-[#D4AF37] mb-4">Datenwahrheit Guardrails</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRODUCT_POSITIONING.guardrails.map((guardrail) => (
            <p key={guardrail} className="text-[10px] text-[#1A1A1A] dark:text-zinc-100 font-bold uppercase tracking-widest leading-relaxed">
              {guardrail}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
